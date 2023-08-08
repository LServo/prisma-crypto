import { createHash, createCipheriv, createDecipheriv } from "node:crypto";

import { PrismaCrypto } from "./prisma-crypto";

class EncryptionMethods implements PrismaCrypto.EncryptionMethods {
    generateHash({
        stringToGenerateHash,
    }: PrismaCrypto.GenerateHash.Input): PrismaCrypto.GenerateHash.Output {
        const hash = createHash("sha256");
        hash.update(stringToGenerateHash, "utf8");

        const generatedHash = hash.digest();

        return { generatedHash };
    }

    resolveEncryptedArgs({
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
                    this.manageEncryption({
                        fieldsToManage,
                        dataToEncrypt: item,
                        manageMode: "encrypt",
                    });
            });
        };

        if (whereArgs)
            this.manageEncryption({
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

    manageEncryption({
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
                                        ? this.encryptData({
                                              stringToEncrypt:
                                                  dataToEncrypt[fieldName][key],
                                          })
                                        : this.decryptData({
                                              stringToDecrypt:
                                                  dataToEncrypt[fieldName][key],
                                          });
                            });
                            break;
                        case true:
                            // eslint-disable-next-line no-param-reassign
                            dataToEncrypt[fieldName] =
                                manageMode === "encrypt"
                                    ? this.encryptData({
                                          stringToEncrypt:
                                              dataToEncrypt[fieldName],
                                      })
                                    : this.decryptData({
                                          stringToDecrypt:
                                              dataToEncrypt[fieldName],
                                      });
                            break;
                        default:
                    }

                    break;
                case true:
                    // eslint-disable-next-line no-param-reassign
                    dataToEncrypt[fieldName] = dataToEncrypt[fieldName].map(
                        (item: string) =>
                            manageMode === "encrypt"
                                ? this.encryptData({ stringToEncrypt: item })
                                : this.decryptData({ stringToDecrypt: item }),
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

    encryptData({
        stringToEncrypt,
    }: PrismaCrypto.EncryptData.Input): PrismaCrypto.EncryptData.Output {
        console.log("encryptData");
        console.log("stringToEncrypt:", stringToEncrypt);
        const { generatedHash: fixedIV } = this.generateHash({
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

    decryptData({
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
}

export { EncryptionMethods };
