import { createHash, createCipheriv, createDecipheriv } from "node:crypto";

import { Prisma } from "@prisma/client";
import { logger } from "@prisma/sdk";

import { prisma } from "./prisma-client";
import { PrismaCrypto } from "./prisma-crypto";

const convertToJson = (variable: any): string => {
    return JSON.stringify(variable, null, 2);
};

const debugMode = process.env.PRISMA_CRYPTO_DEBUG === "true";
class EncryptionMethods implements PrismaCrypto.EncryptionMethods {
    static generateHash({
        stringToGenerateHash,
    }: PrismaCrypto.GenerateHash.Input): PrismaCrypto.GenerateHash.Output {
        const hash = createHash("sha256");
        hash.update(stringToGenerateHash, "utf8");

        const generatedHash = hash.digest();

        return { generatedHash };
    }
    generateHash({
        stringToGenerateHash,
    }: PrismaCrypto.GenerateHash.Input): PrismaCrypto.GenerateHash.Output {
        return EncryptionMethods.generateHash({ stringToGenerateHash });
    }

    static resolveEncryptedArgs({
        whereArgs,
        fieldsToManage,
    }: PrismaCrypto.ResolveEncryptedArgs.Input): PrismaCrypto.ResolveEncryptedArgs.Output {
        if (debugMode)
            logger.info(
                "[resolveEncryptedArgs] whereArgs before:",
                convertToJson(whereArgs),
            );
        const { AND, NOT, OR } =
            (whereArgs as { AND: unknown; NOT: unknown; OR: unknown }) ?? {};

        // criptografar a pesquisa para o banco de dados passando o argumento where

        const manageArrayEncryption = (array: unknown[]) => {
            array.forEach((item) => {
                if (item && typeof item === "object")
                    EncryptionMethods.manageEncryption({
                        fieldsToManage,
                        dataToEncrypt: item,
                        manageMode: "encrypt",
                    });
            });
        };

        if (whereArgs)
            EncryptionMethods.manageEncryption({
                fieldsToManage,
                dataToEncrypt: whereArgs,
                manageMode: "encrypt",
            });
        if (AND) manageArrayEncryption(AND as unknown[]);
        if (NOT) manageArrayEncryption(NOT as unknown[]);
        if (OR) manageArrayEncryption(OR as unknown[]);

        if (debugMode)
            logger.info(
                "[resolveEncryptedArgs] whereArgs after:",
                convertToJson(whereArgs),
            );

        return {};
    }
    resolveEncryptedArgs({
        whereArgs,
        fieldsToManage,
    }: PrismaCrypto.ResolveEncryptedArgs.Input): PrismaCrypto.ResolveEncryptedArgs.Output {
        return EncryptionMethods.resolveEncryptedArgs({
            whereArgs,
            fieldsToManage,
        });
    }

    static manageEncryption({
        dataToEncrypt,
        fieldsToManage,
        manageMode,
    }: PrismaCrypto.ManageEncryption.Input): PrismaCrypto.ManageEncryption.Output {
        fieldsToManage.forEach((field) => {
            const { fieldName } = field;
            const fieldValue = dataToEncrypt[fieldName];
            if (!fieldValue) return;

            if (debugMode)
                logger.info(
                    `[manageEncryption] dataToEncrypt[${fieldName}] before:`,
                    dataToEncrypt[fieldName],
                );

            const isArray = Array.isArray(fieldValue);
            const isString = typeof fieldValue === "string";

            switch (isArray) {
                case false:
                    switch (isString) {
                        case false:
                            Object.keys(fieldValue).forEach((key) => {
                                const allowedKeys = ["equals", "not"];
                                const forbiddenKeys = [
                                    "contains",
                                    "startsWith",
                                    "endsWith",
                                    "in",
                                    "notIn",
                                    "lt",
                                    "lte",
                                    "gt",
                                    "gte",
                                ];

                                if (forbiddenKeys.includes(key))
                                    throw new Error(
                                        `The key "${key}" is not allowed for the field "${fieldName}". Encrypted fields cannot be used with the following keys: ${forbiddenKeys.join(
                                            ", ",
                                        )}`,
                                    );

                                if (!allowedKeys.includes(key)) return; // Caso não tenha nenhum valor proibido, mas também não tenha nenhum permitido, como é o caso do "mode", então, retornamos sem fazer nada

                                if (!dataToEncrypt[fieldName][key]) return;
                                // eslint-disable-next-line no-param-reassign
                                dataToEncrypt[fieldName][key] =
                                    manageMode === "encrypt"
                                        ? EncryptionMethods.encryptData({
                                              stringToEncrypt:
                                                  dataToEncrypt[fieldName][key],
                                          })?.encryptedString
                                        : EncryptionMethods.decryptData({
                                              stringToDecrypt:
                                                  dataToEncrypt[fieldName][key],
                                          })?.decryptedString;
                            });
                            break;
                        case true:
                            // eslint-disable-next-line no-param-reassign
                            dataToEncrypt[fieldName] =
                                manageMode === "encrypt"
                                    ? EncryptionMethods.encryptData({
                                          stringToEncrypt:
                                              dataToEncrypt[fieldName],
                                      })?.encryptedString
                                    : EncryptionMethods.decryptData({
                                          stringToDecrypt:
                                              dataToEncrypt[fieldName],
                                      })?.decryptedString;
                            break;
                        default:
                    }

                    break;
                case true:
                    // eslint-disable-next-line no-param-reassign
                    dataToEncrypt[fieldName] = dataToEncrypt[fieldName].map(
                        (item: string) =>
                            manageMode === "encrypt"
                                ? EncryptionMethods.encryptData({
                                      stringToEncrypt: item,
                                  })?.encryptedString
                                : EncryptionMethods.decryptData({
                                      stringToDecrypt: item,
                                  })?.decryptedString,
                    );
                    break;
                default:
                    break;
            }

            if (debugMode)
                logger.info(
                    `[manageEncryption] dataToEncrypt[${fieldName}] after:`,
                    dataToEncrypt[fieldName],
                );
        });

        return {};
    }
    manageEncryption({
        manageMode,
        dataToEncrypt,
        fieldsToManage,
    }: PrismaCrypto.ManageEncryption.Input): PrismaCrypto.ManageEncryption.Output {
        return EncryptionMethods.manageEncryption({
            manageMode,
            dataToEncrypt,
            fieldsToManage,
        });
    }

    static encryptData({
        stringToEncrypt,
    }: PrismaCrypto.EncryptData.Input): PrismaCrypto.EncryptData.Output {
        if (debugMode)
            logger.info("[encryptData] stringToEncrypt:", stringToEncrypt);
        const { generatedHash: fixedIV } = EncryptionMethods.generateHash({
            stringToGenerateHash: stringToEncrypt,
        });
        const cipher = createCipheriv(
            "aes-256-gcm",
            process.env.SECRET_KEY,
            fixedIV,
        );

        const encrypted = Buffer.concat([
            cipher.update(stringToEncrypt, "utf8"),
            cipher.final(),
        ]);
        const tag = cipher.getAuthTag();

        // Combine o IV, a tag e o texto cifrado em uma única string codificada
        const encryptedString = Buffer.concat([
            fixedIV,
            tag,
            encrypted,
        ]).toString("base64");

        if (debugMode)
            logger.info("[encryptData] encryptedString:", encryptedString);
        return { encryptedString };
    }
    encryptData({
        stringToEncrypt,
    }: PrismaCrypto.EncryptData.Input): PrismaCrypto.EncryptData.Output {
        return EncryptionMethods.encryptData({ stringToEncrypt });
    }

    static decryptData({
        stringToDecrypt,
    }: PrismaCrypto.DecryptData.Input): PrismaCrypto.DecryptData.Output {
        if (debugMode)
            logger.info("[decryptData] stringToDecrypt:", stringToDecrypt);
        const encryptedBuffer = Buffer.from(stringToDecrypt, "base64");

        // Extraia o IV, a tag e o texto cifrado da string codificada
        const iv = encryptedBuffer.subarray(0, 32);
        const tag = encryptedBuffer.subarray(32, 48);
        const encrypted = encryptedBuffer.subarray(48);

        const decipher = createDecipheriv(
            "aes-256-gcm",
            process.env.SECRET_KEY,
            iv,
        );
        decipher.setAuthTag(tag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);

        const decryptedString = decrypted.toString("utf8");

        if (debugMode)
            logger.info("[decryptData] decryptedString:", decryptedString);
        return { decryptedString };
    }
    decryptData({
        stringToDecrypt,
    }: PrismaCrypto.DecryptData.Input): PrismaCrypto.DecryptData.Output {
        return EncryptionMethods.decryptData({ stringToDecrypt });
    }

    static async managingDatabaseEncryption(
        fields: String[],
        fieldsDbName: String[],
        action: "add" | "remove",
    ): Promise<void> {
        if (debugMode)
            logger.info("[managingDatabaseEncryption] index:", fields.length);
        const actualField = fields.shift();
        if (debugMode)
            logger.info(
                "[managingDatabaseEncryption] actualField:",
                actualField,
            );
        const actualFieldDbName = fieldsDbName.shift();
        if (!actualField) return;

        const [schemaTableName, columnName] = actualField.split(".");
        const [dbTableName] = actualFieldDbName.split(".");
        if (debugMode) {
            logger.info(
                "[managingDatabaseEncryption] schemaTableName:",
                actualField,
            );
            logger.info(
                "[managingDatabaseEncryption] dbTableName:",
                dbTableName,
            );
            logger.info("[managingDatabaseEncryption] columnName:", columnName);
        }

        const result = await prisma
            .$queryRaw(
                Prisma.sql`SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = ${dbTableName}
                    AND column_name = ${columnName}
                    ) AS "exists"`,
            )
            .catch((error) => {
                throw new Error(
                    `Error when executing the query to check if the column ${dbTableName}.${columnName} exists: ${error}`,
                );
            });

        const columnExists = result[0]?.exists;
        if (debugMode)
            logger.info(
                "[managingDatabaseEncryption] columnExists:",
                columnExists,
            );

        if (!columnExists) {
            throw new Error(
                `The column ${dbTableName}.${columnName} does not exists in the database.`,
            );
        }

        const columnType = await prisma
            .$queryRaw(
                Prisma.sql`SELECT data_type FROM information_schema.columns WHERE table_name = ${dbTableName} AND column_name = ${columnName};`,
            )
            .catch((error) => {
                throw new Error(
                    `Error when executing the query to get the column type of ${dbTableName}.${columnName}: ${error}`,
                );
            });

        const columnDataType = columnType[0]?.data_type;
        const isArrayColumn = columnDataType === "ARRAY";
        const isTextColumn = columnDataType === "text";
        if (debugMode)
            logger.info(
                "[managingDatabaseEncryption] columnDataType:",
                columnDataType,
            );

        if (!isTextColumn && !isArrayColumn) {
            throw new Error(
                `The column ${dbTableName}.${columnName} is not of type "text".`,
            );
        }

        const getModelPrimaryKey = await prisma
            .$queryRaw(
                Prisma.sql`SELECT column_name FROM information_schema.key_column_usage WHERE table_name = ${dbTableName} AND constraint_name = ${
                    dbTableName + "_pkey"
                };`,
            )
            .catch((error) => {
                throw new Error(
                    `Error when executing the query to get the primary key of ${dbTableName}: ${error}`,
                );
            });

        /**
         * As queries utilizando a api do prisma precisam ser com o nome do model que foi escrito no schema.prisma, por isso, daqui pra baixo não utilizaremos o dbTableName, mas sim o schemaTableName
         */
        const primaryKeyColumnName = getModelPrimaryKey[0]?.column_name;

        const allEntries = await prisma[schemaTableName]
            .findMany({
                select: { [primaryKeyColumnName]: true, [columnName]: true },
            })
            .catch((error) => {
                throw new Error(
                    `Error when executing the query to get all entries of ${schemaTableName}: ${error}`,
                );
            });
        if (debugMode)
            logger.info("[managingDatabaseEncryption] allEntries:", allEntries);

        if (fields.length > 0)
            await this.managingDatabaseEncryption(fields, fieldsDbName, "add");

        // modificar todos os registros da coluna criptografando um a um utilizando o método `EncryptionMethods.encryptData`
        const createPrismaTransactions = allEntries
            .map((entry) => {
                const { [primaryKeyColumnName]: id, [columnName]: value } =
                    entry;
                if (debugMode) {
                    logger.info(
                        "[managingDatabaseEncryption] primaryKeyColumnName:",
                        primaryKeyColumnName,
                    );
                    logger.info(
                        "[managingDatabaseEncryption] columnName:",
                        columnName,
                    );
                    logger.info("[managingDatabaseEncryption] value:", value);
                }
                if (!value) return;

                let newValue: string;
                // adicionar validação para caso seja uma array, verificar se cada tipo é uma string e efetuar criptografia nos valores
                switch (action) {
                    case "add":
                        newValue = EncryptionMethods.encryptData({
                            stringToEncrypt: value,
                        })?.encryptedString;
                        break;
                    case "remove":
                        newValue = EncryptionMethods.decryptData({
                            stringToDecrypt: value,
                        })?.decryptedString;
                        break;
                    default:
                        newValue = value;
                        break;
                }

                if (debugMode) {
                    logger.info("newValue:", newValue);
                    logger.info(`[managingDatabaseEncryption] return prisma[${schemaTableName}].update({
                        where: { [${primaryKeyColumnName}]: ${id} },
                        data: { [${columnName}]: ${newValue} },
                    });`);
                }
                return prisma[schemaTableName].update({
                    where: { [primaryKeyColumnName]: id },
                    data: { [columnName]: newValue },
                });
            })
            .filter(Boolean);

        await prisma.$transaction(createPrismaTransactions);
    }
}

export { EncryptionMethods };
