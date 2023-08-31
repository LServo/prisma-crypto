#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
import "dotenv/config";
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
import { PrismaCrypto as PrismaCryptoClient } from "./prisma-client";
import { PrismaCrypto } from "./prisma-crypto";
export { PrismaCrypto } from "./prisma-client";
export { EncryptionMethods } from "./encryption-methods";

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

    const numberOfModels = modelsInfo.length;

    // criar um loop para rodar o número de vezes que temos de models
    for (let i = 0; i < numberOfModels; i++) {
        const encryptedModelsRegex = Object.keys(modelsEncryptedFields).map(
            (model) => new RegExp(`\\b${model}\\b`),
        );
        currentModel = null;
        lines.forEach((line) => {
            const modelMatch = line.match(modelRegex);
            if (modelMatch) {
                [, currentModel] = modelMatch;
                currentModelDbName = getDbName({
                    modelName: currentModel,
                    modelsInfo,
                });
            }

            let commentMatch = null;
            if (!modelMatch)
                commentMatch = encryptedModelsRegex.some((regex) =>
                    line.match(regex),
                );
            if (commentMatch && currentModel) {
                let [fieldName, typeName] = line.split(/\s+/).filter(Boolean);
                typeName = typeName.replace("[]", "").replace("?", "");

                if (!modelsEncryptedFields[currentModel])
                    modelsEncryptedFields[currentModel] = [];
                if (!modelsEncryptedFieldsDbName[currentModelDbName])
                    modelsEncryptedFieldsDbName[currentModelDbName] = [];

                const fieldAlreadyExists = modelsEncryptedFields[
                    currentModel
                ].some((field) => {
                    return (
                        field.fieldName === fieldName ||
                        field.fieldName === `${fieldName}>${typeName}`
                    );
                });

                if (fieldAlreadyExists) return;

                modelsEncryptedFields[currentModel].push({
                    fieldName: `${fieldName}>${typeName}`,
                    typeName: "Relation",
                });
                modelsEncryptedFieldsDbName[currentModelDbName].push({
                    fieldName: `${fieldName}>${typeName.toLowerCase()}`,
                    typeName: "Relation",
                });
            }
        });
    }

    return { modelsEncryptedFields, modelsEncryptedFieldsDbName };
}

function getMyVar(env_var: string) {
    return process.env[env_var];
}

function validateEnvVars() {
    const requiredEnvVars = [
        "PRISMA_CRYPTO_SECRET_KEY",
        "PRISMA_CRYPTO_DIRECT_DB",
        "PRISMA_CRYPTO_WRITE_DB",
        "PRISMA_CRYPTO_READ_DB",
    ];

    const missingEnvVars: string[] = [];

    for (const envVar of requiredEnvVars) {
        const value = getMyVar(envVar);
        if (!value) missingEnvVars.push(envVar);
    }

    if (missingEnvVars.length > 0) {
        logger.error(
            `The following environment variables are required: ${missingEnvVars.join(
                ", ",
            )}.`,
        );
        process.exit(1);
    }
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
        validateEnvVars();
        const prisma = new PrismaCryptoClient({}).getPrismaClient();
        const {
            modelsEncryptedFields: newEncryptedModels,
            modelsEncryptedFieldsDbName: newEncryptedModelsDbName,
        } = findEncryptFields(
            options.schemaPath,
            options.dmmf.datamodel.models,
        );

        const schemaHasMigrateEncryption = options.dmmf.datamodel.models
            .map((model) => model.dbName)
            .includes("_migrate_encryption");
        const modelMigrateEncryption = `\nmodel MigrateEncryption {
                id Int @id @default(autoincrement())
            
                token             String
                applied           Boolean  @default(false)
                add_encryption    String[]
                remove_encryption String[]
            
                created_at DateTime @default(now())
            
                @@map("_migrate_encryption")
            }`;

        if (!schemaHasMigrateEncryption) {
            fs.appendFileSync(
                options.schemaPath,
                modelMigrateEncryption,
                "utf-8",
            );
            logger.info(
                "The `_migrate_encryption` table was added to your schema.prisma.",
            );
        }

        const onlyPostgresProvider = options.datasources.every(
            (datasource) => datasource.provider === "postgresql",
        );

        if (!onlyPostgresProvider) {
            logger.error(
                "Prisma Crypto currently only supports PostgreSQL databases.",
            );
            process.exit(1);
        }

        if (!fs.existsSync(resolve(__dirname))) return { exitCode: 1 };

        const searchForMigrateEncryption = await prisma.$queryRaw<boolean>(
            Prisma.sql`SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = '_migrate_encryption'
                ) AS "exists"`,
        );
        const dbHasMigrateEncryption = searchForMigrateEncryption[0]?.exists;

        if (dbHasMigrateEncryption) {
            logger.info(
                "The table `_migrate_encryption` already exists in the database.",
            );
        } else {
            logger.info(
                "The table `_migrate_encryption` does not yet exist in the database.",
            );

            const prismaCryptoSchemaPath = resolve(
                __dirname,
                "..",
                "prisma",
                "crypto.schema.prisma",
            );

            const originalSchemaDirectory = options.schemaPath
                .split("/")
                .slice(0, -1);
            originalSchemaDirectory.push("crypto.schema.prisma");
            const temporarySchemaPath = originalSchemaDirectory.join("/");

            if (fs.existsSync(temporarySchemaPath))
                fs.unlinkSync(temporarySchemaPath);

            fs.copyFileSync(
                prismaCryptoSchemaPath,
                temporarySchemaPath,
                fs.constants.COPYFILE_EXCL,
            );

            logger.info("Temporary Schema Path:", temporarySchemaPath);
            try {
                logger.info("Synchronizing database schema...");
                execSync(`npx prisma db pull --schema=${temporarySchemaPath}`);

                fs.appendFileSync(
                    temporarySchemaPath,
                    modelMigrateEncryption,
                    "utf-8",
                );

                // execSync(
                //     `npx prisma db push --skip-generate --schema=${schemaPath}`,
                // );
                execSync(
                    `npx prisma migrate dev --name prisma_crypto_migrate_encryption --skip-generate --skip-seed --schema=${temporarySchemaPath}`,
                );

                if (fs.existsSync(temporarySchemaPath))
                    fs.unlinkSync(temporarySchemaPath);

                logger.info("Synchronization completed successfully.");
            } catch (error) {
                logger.error(
                    "Error when executing `prisma db push/pull/migrate` command:",
                    error,
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

            // Reconhece as mudanças entre as migrations de criptografia
            const getEncryptionChanges = (
                newModels: PrismaCrypto.PrismaEncryptModels,
                oldModels: PrismaCrypto.PrismaEncryptModels,
            ) => {
                // verifica se algum model foi removido da lista de models para criptografar, se sim, automaticamente todos os campos dele devem entrar para a lista de remove_encryption
                const { removed_fields } = oldModels
                    ? Object.keys(oldModels).reduce(
                          (acc, curr) => {
                              if (newModels[curr]) return acc;

                              const modelFields = oldModels[curr].map(
                                  (field) => `${curr}.${field.fieldName}`,
                              );

                              acc.removed_fields.push(...modelFields);

                              return acc;
                          },
                          {
                              removed_fields: [] as string[],
                          },
                      )
                    : { removed_fields: [] as string[] };

                //transformar em array de strings
                const { add_encryption, remove_encryption } = Object.keys(
                    newModels,
                ).reduce(
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

                remove_encryption.push(...removed_fields);

                return {
                    add_encryption,
                    remove_encryption,
                };
            };

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

        const regex = /exports\.prismaEncryptModels = \{/;
        const findIndex = readEncryptedModelsFile.search(regex);

        if (findIndex !== -1) {
            const cutInterestParts = readEncryptedModelsFile.slice(
                0,
                findIndex,
            );

            const newContent =
                cutInterestParts +
                "exports.prismaEncryptModels = " +
                newEncryptedModelsJSON +
                ";";

            fs.writeFileSync(encryptedModelsFilePath, newContent, "utf-8");
        }

        logger.info(`Encrypted models: ${encryptedModelsFilePath}`);
        return {
            exitCode: 0,
        };
    },
});
