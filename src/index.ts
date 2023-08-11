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
): {
    modelsEncryptedFields: PrismaCrypto.PrismaEncryptModels;
    modelsEncryptedFieldsDbName: PrismaCrypto.PrismaEncryptModels;
} {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const lines = fileContent.split("\n");

    const commentRegex = /\/\/.*?@encrypt\b/;
    const modelRegex = /^\s*model\s+(\w+)/;

    const modelsEncryptedFields = {} satisfies PrismaCrypto.PrismaEncryptModels;
    const modelsEncryptedFieldsDbName =
        {} satisfies PrismaCrypto.PrismaEncryptModels;

    let currentModel: string = null;
    let currentModelDbName: string = null;

    lines.forEach((line) => {
        const modelMatch = line.match(modelRegex);
        if (modelMatch) {
            [, currentModel] = modelMatch;
            currentModelDbName = getDbName({
                modelName: currentModel,
                modelsInfo,
            });
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
            if (!modelsEncryptedFieldsDbName[currentModelDbName])
                modelsEncryptedFieldsDbName[currentModelDbName] = [];

            modelsEncryptedFields[currentModel].push({ fieldName, typeName });
            modelsEncryptedFieldsDbName[currentModelDbName].push({
                fieldName,
                typeName,
            });
        }
    });

    return { modelsEncryptedFields, modelsEncryptedFieldsDbName };
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

    const modelDbName = findModelInfo?.dbName || modelName;
    if (!modelDbName) {
        logger.error(`Model ${modelName} not found in the database.`);
        process.exit(1);
    }

    return modelDbName;
};

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
        execSync(
            `(cd ${__dirname} && tsc ../src/prisma-client.ts --outDir ${__dirname})`,
            {
                stdio: "inherit",
            },
        );
        const {
            modelsEncryptedFields: newEncryptedModels,
            modelsEncryptedFieldsDbName: newEncryptedModelsDbName,
        } = findEncryptFields(
            options.schemaPath,
            options.dmmf.datamodel.models,
        );

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

                const modelMigrateEncryption = `\nmodel MigrateEncryption {
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

        try {
            const newToken = sign(
                {
                    encryptedModels: newEncryptedModels,
                    encryptedModelsDbName: newEncryptedModelsDbName,
                },
                "prisma-crypto-secret",
            );

            let lastEncryptedModels: {
                encryptedModels: PrismaCrypto.PrismaEncryptModels;
                encryptedModelsDbName: PrismaCrypto.PrismaEncryptModels;
            };
            if (latestMigration[0]) {
                lastEncryptedModels = verify(
                    latestMigration[0]?.token,
                    "prisma-crypto-secret",
                ) as {
                    encryptedModels: PrismaCrypto.PrismaEncryptModels;
                    encryptedModelsDbName: PrismaCrypto.PrismaEncryptModels;
                };
            }

            const getEncryptionChanges = (
                newModels: PrismaCrypto.PrismaEncryptModels,
                oldModels: PrismaCrypto.PrismaEncryptModels,
            ) =>
                Object.keys(newModels).reduce(
                    (acc, curr) => {
                        let newFields: string[];
                        if (newModels)
                            newFields = newModels[curr]?.map(
                                (field) => `${curr}.${field.fieldName}`,
                            );

                        let oldFields: string[];
                        if (oldModels)
                            oldFields =
                                oldModels[curr]?.map(
                                    (field) => `${curr}.${field.fieldName}`,
                                ) || [];

                        const fieldsToAdd = newFields?.filter(
                            (field) => !oldFields?.includes(field),
                        );
                        acc.add_encryption.push(...fieldsToAdd);

                        const fieldsToRemove = oldFields?.filter(
                            (field) => !newFields?.includes(field),
                        );
                        acc.remove_encryption.push(...fieldsToRemove);

                        return acc;
                    },
                    {
                        add_encryption: [] as String[],
                        remove_encryption: [] as String[],
                    },
                );

            const { add_encryption, remove_encryption } = getEncryptionChanges(
                newEncryptedModels,
                lastEncryptedModels?.encryptedModels,
            );

            const {
                add_encryption: add_encryption_db_name,
                remove_encryption: remove_encryption_db_name,
            } = getEncryptionChanges(
                newEncryptedModelsDbName,
                lastEncryptedModels?.encryptedModelsDbName,
            );

            const hasChanges =
                add_encryption.length || remove_encryption.length;

            if (hasChanges) {
                logger.info("Changes found!");

                logger.info("Managing encryption...");
                // criar função para aplicar ou remover a criptografia com base add_encryption e remove_encryption

                try {
                    const deepClonedAddEncryption = JSON.parse(
                        JSON.stringify(add_encryption),
                    ) as String[];
                    const deepClonedAddEncryptionDbName = JSON.parse(
                        JSON.stringify(add_encryption_db_name),
                    ) as String[];
                    const deepClonedRemoveEncryption = JSON.parse(
                        JSON.stringify(remove_encryption),
                    ) as String[];
                    const deepClonedRemoveEncryptionDbName = JSON.parse(
                        JSON.stringify(remove_encryption_db_name),
                    ) as String[];

                    await EncryptionMethods.managingDatabaseEncryption(
                        deepClonedAddEncryption,
                        deepClonedAddEncryptionDbName,
                        "add",
                    );
                    await EncryptionMethods.managingDatabaseEncryption(
                        deepClonedRemoveEncryption,
                        deepClonedRemoveEncryptionDbName,
                        "remove",
                    );
                } catch (error) {
                    logger.error(
                        "Error when applying encryption to the database:",
                        error,
                    );
                    process.exit(1);
                }

                logger.info("Saving current state...");
                const newMigration =
                    await prisma.$queryRaw<PrismaCrypto.MigrateEncryption>(
                        Prisma.sql`INSERT INTO "_migrate_encryption" ("token", "add_encryption", "remove_encryption") VALUES (${newToken}, ${add_encryption}, ${remove_encryption}) RETURNING *;`,
                    );
                logger.info(
                    "Added Encryption:",
                    JSON.stringify(newMigration[0]?.add_encryption),
                );
                logger.info(
                    "Removed Encryption:",
                    JSON.stringify(newMigration[0]?.remove_encryption),
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

        logger.info(`Encrypted models: ${encryptedModelsFilePath}`);

        return {
            exitCode: 0,
        };
    },
});
