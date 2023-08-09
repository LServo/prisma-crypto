#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

import { sign, verify } from "jsonwebtoken";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { resolve } from "node:path";

import { Prisma } from "@prisma/client";
import {
    DMMF,
    generatorHandler,
    GeneratorOptions,
} from "@prisma/generator-helper";
import { logger } from "@prisma/sdk";

import { EncryptionMethods } from "./encryption-methods";
import { prisma } from "./prisma-client";
import { PrismaCrypto } from "./prisma-crypto";
export { prisma } from "./prisma-client";

function findEncryptFields(
    filePath: string,
    modelsInfo: DMMF.Model[],
): PrismaCrypto.PrismaEncryptModels {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const lines = fileContent.split("\n");

    const commentRegex = /\/\/.*?@encrypt\b/;
    const modelRegex = /^\s*model\s+(\w+)/;

    const modelsEncryptedFields = {} satisfies PrismaCrypto.PrismaEncryptModels;

    let currentModel: string = null;

    lines.forEach((line) => {
        const modelMatch = line.match(modelRegex);
        if (modelMatch) {
            [, currentModel] = modelMatch;
            currentModel = getDbName({ modelName: currentModel, modelsInfo });
        }

        const commentMatch = line.match(commentRegex);
        if (commentMatch && currentModel) {
            const [fieldName, typeName] = line.split(/\s+/).filter(Boolean);

            if (!typeName.includes("String")) {
                logger.error(
                    `@encrypt is only supported for String fields. Field ${currentModel}.${fieldName} is ${typeName}.`,
                );
                process.exit(1); // Encerra o processo com um código de erro (1)
            }

            if (!modelsEncryptedFields[currentModel])
                modelsEncryptedFields[currentModel] = [];

            modelsEncryptedFields[currentModel].push({ fieldName, typeName });
        }
    });

    return modelsEncryptedFields;
}

// função que recebe um nome de model do schema.prisma e retorna o nome do model no banco de dados
const getDbName = ({
    modelName,
    modelsInfo,
}: {
    modelName: string;
    modelsInfo: DMMF.Model[];
}): string => {
    const findModelInfo = modelsInfo.find((model) => model.name === modelName);

    const modelDbName = findModelInfo?.dbName;
    if (!modelDbName) {
        logger.error(`Model ${modelName} not found in the database.`);
        process.exit(1); // Encerra o processo com um código de erro (1)
    }

    return modelDbName;
};

// const convertToJson = (variable: any): string => {
//     return JSON.stringify(variable, null, 2);
// };

generatorHandler({
    onManifest() {
        return {
            version: "1.0.0",
            // defaultOutput: "node_modules/@prisma-client",
            defaultOutput: "./",
            prettyName: "Prisma Crypto",
        };
    },
    async onGenerate(options: GeneratorOptions) {
        const newEncryptedModels = findEncryptFields(
            options.schemaPath,
            options.dmmf.datamodel.models,
        );
        const executionUrl =
            process.env[options.generator?.config?.var_env_url as string];

        process.env.PRISMA_CRYPTO = executionUrl || process.env.PRISMA_WRITE;

        if (!fs.existsSync(resolve(__dirname))) return { exitCode: 1 };

        const result = await prisma.$queryRaw<boolean>(
            Prisma.sql`SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = '_migrate_encryption'
                ) AS "exists"`,
        );

        const modelExists = result[0]?.exists;

        if (modelExists) {
            logger.info(
                "The table `_migrate_encryption` already exists in the database.",
            );
        } else {
            logger.info(
                "The table `_migrate_encryption` does not yet exist in the database.",
            );

            const schemaPath = resolve(
                __dirname,
                "..",
                "prisma",
                "schema.prisma",
            );
            logger.info("Schema Path:", schemaPath);
            try {
                logger.info("Synchronizing database schema...");
                execSync(`npx prisma db pull --schema=${schemaPath}`);

                const modelMigrateEncryption = `\nmodel migrate_encryption {
                    id Int @id @default(autoincrement())
                
                    token             String
                    add_encryption    String[]
                    remove_encryption String[]
                
                    created_at DateTime @default(now())
                
                    @@map("_migrate_encryption")
                }`;

                fs.appendFileSync(schemaPath, modelMigrateEncryption, "utf-8");

                execSync(
                    `npx prisma db push --skip-generate --schema=${schemaPath}`,
                );
                logger.info("Synchronization completed successfully.");
            } catch (error) {
                logger.error(
                    "Error when executing `prisma db push/pull` command:",
                    error,
                );
                logger.info(
                    "This command uses the `PRISMA_WRITE` environment variable if there is no `var_env_url` property in the generator of schema.prisma",
                );
                process.exit(1);
            }
        }

        let latestMigration: PrismaCrypto.MigrateEncryption[];
        try {
            latestMigration = await prisma.$queryRaw(
                Prisma.sql`SELECT * FROM "_migrate_encryption" ORDER BY "created_at" DESC LIMIT 1;`,
            );

            logger.info("Most recent record:", latestMigration[0]?.created_at);
        } catch (error) {
            logger.error("Error fetching the most recent record:", error);
            process.exit(1);
        }

        // Verificar o token e obter os dados originais
        try {
            const newToken = sign(newEncryptedModels, "prisma-crypto-secret");

            let lastEncryptedModels: PrismaCrypto.PrismaEncryptModels;
            if (latestMigration[0]) {
                lastEncryptedModels = verify(
                    latestMigration[0]?.token,
                    "prisma-crypto-secret",
                ) as PrismaCrypto.PrismaEncryptModels;
            }

            const { add_encryption, remove_encryption } = Object.keys(
                newEncryptedModels,
            ).reduce(
                (acc, curr) => {
                    let newFields = newEncryptedModels[curr]?.map(
                        (field) => `${curr}.${field.fieldName}`,
                    );
                    const lastFields =
                        lastEncryptedModels?.[curr]?.map(
                            (field) => `${curr}.${field.fieldName}`,
                        ) || [];

                    const fieldsToAdd = newFields.filter(
                        (field) => !lastFields.includes(field),
                    );
                    acc.add_encryption.push(...fieldsToAdd);

                    const fieldsToRemove = lastFields.filter(
                        (field) => !newFields.includes(field),
                    );
                    acc.remove_encryption.push(...fieldsToRemove);

                    return acc;
                },
                {
                    add_encryption: [] as String[],
                    remove_encryption: [] as String[],
                },
            );

            const hasChanges =
                add_encryption.length || remove_encryption.length;
            console.log("add_encryption.length:", add_encryption.length);
            console.log("remove_encryption.length:", remove_encryption.length);

            console.log("hasChanges:", hasChanges);
            if (hasChanges) {
                logger.info("Changes found!");

                logger.info("Managing encryption...");
                // criar função para aplicar ou remover a criptografia com base add_encryption e remove_encryption

                await EncryptionMethods.managingDatabaseEncryption(
                    add_encryption,
                    "add",
                );
                logger.info("Saving current state...");
                const newMigration =
                    await prisma.$queryRaw<PrismaCrypto.MigrateEncryption>(
                        Prisma.sql`INSERT INTO "_migrate_encryption" ("token", "add_encryption", "remove_encryption") VALUES (${newToken}, ${add_encryption}, ${remove_encryption}) RETURNING *;`,
                    );
                logger.info("newMigration:", newMigration[0]); //remover
                logger.info(
                    "Added Encryption:",
                    JSON.stringify(newMigration[0]?.add_encryption),
                );
                logger.info(
                    "Removed Encryption:",
                    newMigration[0]?.remove_encryption,
                );
            }
        } catch (error) {
            logger.error("Erro ao verificar o token:", error);
            process.exit(1);
        }

        const encryptedModelsFilePath = resolve(
            __dirname,
            "encrypted-models.js",
        );

        const newEncryptedModelsJSON = JSON.stringify(
            newEncryptedModels,
            null,
            4,
        );

        const readEncryptedModelsFile = fs.readFileSync(
            encryptedModelsFilePath,
            "utf8",
        );
        const parseToString = `${readEncryptedModelsFile}`;
        const addModels = parseToString.replace(
            /exports.prismaEncryptModels = {}/g,
            `exports.prismaEncryptModels = ${newEncryptedModelsJSON}`,
        );

        fs.writeFileSync(encryptedModelsFilePath, addModels, "utf-8");

        logger.info(`Encrypted fields: ${encryptedModelsFilePath}`);

        return {
            exitCode: 0,
        };
    },
});
