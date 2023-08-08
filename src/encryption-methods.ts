import { createHash, createCipheriv, createDecipheriv } from "node:crypto";

import { Prisma } from "@prisma/client";
import { logger } from "@prisma/sdk";

import { prisma } from "./prisma-client";
import { PrismaCrypto } from "./prisma-crypto";

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
        // console.log("args before:", ConvertToJson(args));
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

        // console.log("args after:", ConvertToJson(args));

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

            console.log(
                `dataToEncrypt[${fieldName}]:`,
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

            console.log(
                `dataToEncrypt[${fieldName}]:`,
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
        console.log("encryptData");
        console.log("stringToEncrypt:", stringToEncrypt);
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
        console.log("decryptData");
        console.log("stringToDecrypt:", stringToDecrypt);
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

        return { decryptedString };
    }
    decryptData({
        stringToDecrypt,
    }: PrismaCrypto.DecryptData.Input): PrismaCrypto.DecryptData.Output {
        return EncryptionMethods.decryptData({ stringToDecrypt });
    }

    static async managingDatabaseEncryption(
        fields: String[],
        action: "add" | "remove",
    ) {
        console.log("action:", action);
        const fieldsToManage = fields.map((field) => {
            const [model, fieldName] = field.split(".");
            return { model, fieldName };
        });

        fieldsToManage.forEach(async (field) => {
            const { model: tableName, fieldName: columnName } = field;

            const result = await prisma.$queryRaw(
                Prisma.sql`SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = ${tableName}
                    AND column_name = ${columnName}
                    ) AS "exists"`,
            );

            const columnExists = result[0]?.exists;

            if (!columnExists) {
                logger.error(
                    `The column ${tableName}.${columnName} does not exists in the database.`,
                );
                process.exit(1);
            }

            const columnType = await prisma.$queryRaw(
                Prisma.sql`SELECT data_type FROM information_schema.columns WHERE table_name = ${tableName} AND column_name = ${columnName};`,
            );

            const columnDataType = columnType[0]?.data_type;

            if (columnDataType !== "text") {
                logger.error(
                    `The column ${tableName}.${columnName} is not of type "text".`,
                );
                process.exit(1);
            }
            // encontre a primary key da tabela
            const getModelPrimaryKey = await prisma.$queryRaw(
                Prisma.sql`SELECT column_name FROM information_schema.key_column_usage WHERE table_name = ${tableName} AND constraint_name = '${tableName}_pkey';`,
            );
            console.log("getModelPrimaryKey:", getModelPrimaryKey);

            const primaryKeyColumnName = getModelPrimaryKey[0]?.column_name;
            console.log("primaryKeyColumnName:", primaryKeyColumnName);

            // modificar todos os registros da coluna criptografando um a um utilizando o método `EncryptionMethods.encryptData`
            const allEntries: any[] = await prisma.$queryRaw(
                Prisma.sql`SELECT ${primaryKeyColumnName}, ${columnName} FROM ${tableName};`,
            );
            console.log("allEntries:", allEntries);

            // prisma.$transaction(
            //     allEntries.map((entry) => {
            //         const { id, [columnName]: value } = entry;
            //         const encryptedValue = EncryptionMethods.encryptData({
            //             stringToEncrypt: value,
            //         })?.encryptedString;

            //         return prisma.$queryRaw(
            //             Prisma.sql`UPDATE ${tableName} SET ${columnName} = ${encryptedValue} WHERE ${primaryKeyColumnName} = ${id};`,
            //         );
            //     }),
            // );
        });
    }
}

export { EncryptionMethods };
