/* eslint-disable no-case-declarations */
import "dotenv/config";
import { createHash, createCipheriv, createDecipheriv } from "node:crypto";

import { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "@prisma/sdk";

import { prismaEncryptModels } from "./encrypted-models";
import { PrismaCrypto } from "./prisma-crypto";

const convertToJson = (variable: any): string => {
    return JSON.stringify(variable, null, 2);
};
function getMyVar(env_var: string) {
    return process.env[env_var];
}

const prismaDirect = new PrismaClient({
    datasources: {
        db: {
            url: getMyVar("PRISMA_CRYPTO_DIRECT_DB"),
        },
    },
});

const debugMode = getMyVar("PRISMA_CRYPTO_DEBUG") === "true";
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
            const isRelation = field.typeName === "Relation";
            const fieldName = !isRelation
                ? field.fieldName
                : field.fieldName.split(">")[0];

            const fieldValue = dataToEncrypt[fieldName];
            if (!fieldValue) return;

            if (debugMode)
                logger.info(
                    `[manageEncryption] dataToEncrypt[${fieldName}] before:`,
                    dataToEncrypt[fieldName],
                );

            // função que vai aplicar a criptografia ou decriptografia numa string, levando em consideração o modo de gerenciamento
            const manageEncryptionMode = (input: any): string => {
                const isString = typeof input === "string";
                if (!isString) {
                    logger.error(
                        `[managingDatabaseEncryption] Error when encrypting the value "${input}" of the column "${fieldName}": The value is not a string.`,
                    );
                    process.exit(1);
                }
                switch (manageMode) {
                    case "encrypt":
                        try {
                            input = EncryptionMethods.encryptData({
                                stringToEncrypt: input,
                            })?.encryptedString;
                        } catch (error) {
                            logger.error(
                                `[managingDatabaseEncryption] Error when encrypting the value "${input}" of the column "${fieldName}": ${error}`,
                            );
                            process.exit(1);
                        }
                        break;
                    case "decrypt":
                        try {
                            input = EncryptionMethods.decryptData({
                                stringToDecrypt: input,
                            })?.decryptedString;
                        } catch (error) {
                            logger.error(
                                `[managingDatabaseEncryption] Error when decrypting the value "${input}" of the column "${fieldName}": ${error}`,
                            );
                            process.exit(1);
                        }
                        break;
                    default:
                }

                return input;
            };

            // função que vai reconhecer o tipo de dado, que pode ser uma string ou um objeto. Se for uma string, então simplesmente aplicamos a função manageEncryptionMode passando a string como argumento. Se for um objeto, então precisamos verificar se é fruto de um Relacionamento ou não. Caso seja um relacionamento, então iteramos sobre as propriedades do objeto verificando na referência do model relacionado, quais precisamos aplicar a criptografia. Caso não seja um Relacionamento, significa que estamos lidando com parâmetros do prisma, portanto iremos iterar sobre as propriedades do objeto, verificando os parâmetros que podem ser utilizados e aplicando a criptografia no valor se tudo estiver correto.
            const executeEncryption = (input: any): any => {
                const isString = typeof input === "string";
                switch (isString) {
                    case false: // se não for uma string, nem uma array, é um objeto
                        switch (isRelation) {
                            case true:
                                const [, modelName] =
                                    field.fieldName.split(">");
                                const fieldsToManage =
                                    prismaEncryptModels[modelName];

                                const applyCryptoToRelation = (inputObject) => {
                                    const fieldsNameToManage =
                                        fieldsToManage.map(
                                            (field) => field.fieldName,
                                        );
                                    Object.keys(inputObject).forEach((key) => {
                                        if (!inputObject[key]) return;
                                        const mustManageField =
                                            fieldsNameToManage.includes(key);
                                        // necessario fazer um novo split para pegar o fieldName e comparar com a key

                                        if (mustManageField) {
                                            inputObject[key] =
                                                manageEncryptionMode(
                                                    inputObject[key],
                                                );
                                        } else {
                                            // se não encontrou diretamente, verificar se é uma tabela pivo
                                            const foundField =
                                                fieldsToManage.find((field) => {
                                                    if (
                                                        field.fieldName.includes(
                                                            ">",
                                                        )
                                                    ) {
                                                        const [fieldName] =
                                                            field.fieldName.split(
                                                                ">",
                                                            );
                                                        return (
                                                            fieldName === key
                                                        );
                                                    }
                                                    return false;
                                                });

                                            if (foundField) {
                                                // se encontrou um relacionamento dentro de outro, então pegar a referencia para criptografia do model relacionado
                                                const [, otherModelName] =
                                                    foundField.fieldName.split(
                                                        ">",
                                                    );
                                                const newFieldsToManage =
                                                    prismaEncryptModels[
                                                        otherModelName
                                                    ];

                                                const newFieldsNameToManage =
                                                    newFieldsToManage.map(
                                                        (field) =>
                                                            field.fieldName,
                                                    );

                                                // sendo uma tabela pivô, precisamos verificar se é um array de objetos ou um objeto
                                                // desconsiderar a key atual, e buscar o segundo nível

                                                const isObject =
                                                    typeof inputObject[key] ===
                                                    "object";

                                                if (isObject) {
                                                    // se for um objeto, basta iterar nas propriedades e ir aplicando a criptografia nos campos que precisam
                                                    Object.keys(
                                                        inputObject[key],
                                                    ).forEach((prop) => {
                                                        if (
                                                            !inputObject[key][
                                                                prop
                                                            ]
                                                        )
                                                            return;
                                                        const newMustManageField =
                                                            newFieldsNameToManage.includes(
                                                                prop,
                                                            );

                                                        if (
                                                            newMustManageField
                                                        ) {
                                                            inputObject[key][
                                                                prop
                                                            ] =
                                                                manageEncryptionMode(
                                                                    inputObject[
                                                                        key
                                                                    ][prop],
                                                                );
                                                        }
                                                    });
                                                }

                                                const isArray = Array.isArray(
                                                    inputObject[key],
                                                );

                                                if (isArray) {
                                                    // se for array, precisamos de um loop a mais
                                                    inputObject[key].forEach(
                                                        (item) => {
                                                            Object.keys(
                                                                item,
                                                            ).forEach(
                                                                (prop) => {
                                                                    if (
                                                                        !item[
                                                                            prop
                                                                        ]
                                                                    )
                                                                        return;
                                                                    const newMustManageField =
                                                                        newFieldsNameToManage.includes(
                                                                            prop,
                                                                        );
                                                                    if (
                                                                        newMustManageField
                                                                    ) {
                                                                        item[
                                                                            prop
                                                                        ] =
                                                                            manageEncryptionMode(
                                                                                item[
                                                                                    prop
                                                                                ],
                                                                            );
                                                                    }
                                                                },
                                                            );
                                                        },
                                                    );
                                                }
                                            }
                                        }
                                    });
                                };

                                const createRelationMethods = [
                                    "connect",
                                    "create",
                                    "createMany",
                                    "connectOrCreate",
                                ];
                                const objectProperties = Object.keys(input);

                                const isCreateRelationMethod =
                                    createRelationMethods.some((method) =>
                                        objectProperties.includes(method),
                                    );

                                if (isCreateRelationMethod) {
                                    objectProperties.forEach((method) => {
                                        switch (method) {
                                            case "connect":
                                                EncryptionMethods.resolveEncryptedArgs(
                                                    {
                                                        whereArgs:
                                                            input[method],
                                                        fieldsToManage,
                                                    },
                                                );
                                                break;
                                            case "create":
                                                applyCryptoToRelation(
                                                    input[method],
                                                );
                                                break;
                                            case "connectOrCreate":
                                                applyCryptoToRelation(
                                                    input[method]["create"],
                                                );
                                                EncryptionMethods.resolveEncryptedArgs(
                                                    {
                                                        whereArgs:
                                                            input[method][
                                                                "where"
                                                            ],
                                                        fieldsToManage,
                                                    },
                                                );
                                                break;
                                            case "createMany":
                                                input[method]["data"].forEach(
                                                    (item) => {
                                                        applyCryptoToRelation(
                                                            item,
                                                        );
                                                    },
                                                );
                                                break;
                                            default:
                                                break;
                                        }
                                    });
                                } else {
                                    // se não tem os métodos, quer dizer que estamos tentando ler um resultado de busca por relacionamento
                                    applyCryptoToRelation(input);
                                }
                                break;
                            case false:
                                Object.keys(input).forEach((key) => {
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

                                    if (!input[key]) return;
                                    input[key] = manageEncryptionMode(
                                        input[key],
                                    );
                                });
                                break;
                            default:
                        }
                        break;
                    case true:
                        input = manageEncryptionMode(input);
                        break;
                    default:
                }

                return input;
            };

            const isArray = Array.isArray(fieldValue);
            switch (isArray) {
                case false:
                    dataToEncrypt[fieldName] = executeEncryption(
                        dataToEncrypt[fieldName],
                    );
                    break;
                case true:
                    // eslint-disable-next-line no-param-reassign
                    dataToEncrypt[fieldName] = dataToEncrypt[fieldName].map(
                        (item: string) => {
                            item = executeEncryption(item);

                            return item;
                        },
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
            getMyVar("PRISMA_CRYPTO_SECRET_KEY"),
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
            getMyVar("PRISMA_CRYPTO_SECRET_KEY"),
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

    static AllPrismaTransactions: any[] = [];

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

        const isRelation = columnName.includes(">"); // caso seja uma definição de relacionamento, não precisamos aplicar criptografia direta, ela será utilizada apenas pelo prisma client

        if (!isRelation) {
            if (debugMode) {
                logger.info(
                    "[managingDatabaseEncryption] schemaTableName:",
                    actualField,
                );
                logger.info(
                    "[managingDatabaseEncryption] dbTableName:",
                    dbTableName,
                );
                logger.info(
                    "[managingDatabaseEncryption] columnName:",
                    columnName,
                );
            }

            const result = await prismaDirect
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

            const columnType = await prismaDirect
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

            const getModelPrimaryKey = await prismaDirect
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

            const allEntries = await prismaDirect[schemaTableName]
                .findMany({
                    select: {
                        [primaryKeyColumnName]: true,
                        [columnName]: true,
                    },
                })
                .catch((error) => {
                    throw new Error(
                        `Error when executing the query to get all entries of ${schemaTableName}: ${error}`,
                    );
                });
            if (debugMode)
                logger.info(
                    "[managingDatabaseEncryption] allEntries:",
                    allEntries,
                );

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
                        logger.info(
                            "[managingDatabaseEncryption] value:",
                            value,
                        );
                    }
                    if (!value) return;

                    let newValue: string | string[];
                    // adicionar validação para caso seja uma array, verificar se cada tipo é uma string e efetuar criptografia nos valores

                    const manageEncryption = (input: string) => {
                        let output: string;
                        switch (action) {
                            case "add":
                                try {
                                    output = EncryptionMethods.encryptData({
                                        stringToEncrypt: input,
                                    })?.encryptedString;
                                } catch (error) {
                                    logger.error(
                                        `[managingDatabaseEncryption] Error when encrypting the value "${input}" of the column "${columnName}" of the table "${schemaTableName}": ${error}`,
                                    );
                                    process.exit(1);
                                }
                                break;
                            case "remove":
                                try {
                                    output = EncryptionMethods.decryptData({
                                        stringToDecrypt: input,
                                    })?.decryptedString;
                                } catch (error) {
                                    logger.error(
                                        `[managingDatabaseEncryption] Error when decrypting the value "${input}" of the column "${columnName}" of the table "${schemaTableName}": ${error}`,
                                    );
                                    process.exit(1);
                                }
                                break;
                            default:
                                output = input;
                                break;
                        }

                        return output;
                    };

                    if (isArrayColumn) {
                        const isArrayOfStrings = (array: any[]) => {
                            return array.every(
                                (item) => typeof item === "string",
                            );
                        };

                        if (!isArrayOfStrings(value)) {
                            logger.error(
                                `[managingDatabaseEncryption] The column "${columnName}" of the table "${schemaTableName}" is an array, but it is not an array of strings.`,
                            );
                            process.exit(1);
                        }

                        newValue = value.map((item: string) =>
                            manageEncryption(item),
                        );
                    } else {
                        newValue = manageEncryption(value);
                    }

                    if (debugMode) {
                        logger.info(
                            "[managingDatabaseEncryption] newValue:",
                            newValue,
                        );
                        logger.info(`[managingDatabaseEncryption] return prisma[${schemaTableName}].update({
                        where: { [${primaryKeyColumnName}]: ${id} },
                        data: { [${columnName}]: ${newValue} },
                    });`);
                    }
                    return prismaDirect[schemaTableName].update({
                        where: { [primaryKeyColumnName]: id },
                        data: { [columnName]: newValue },
                    });
                })
                .filter(Boolean);

            this.AllPrismaTransactions.push(...createPrismaTransactions);
        }
        if (fields?.length > 0)
            await this.managingDatabaseEncryption(fields, fieldsDbName, action);

        if (this.AllPrismaTransactions?.length > 0) {
            await prismaDirect.$transaction(this.AllPrismaTransactions);
            this.AllPrismaTransactions = [];
        }
    }
}

export { EncryptionMethods };
