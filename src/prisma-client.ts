/* eslint-disable no-case-declarations */
import { createHash, createCipheriv, createDecipheriv } from "node:crypto";

import { PrismaClient } from "@prisma/client";

// eslint-disable-next-line import/no-unresolved, import/extensions
import { prismaEncryptFields } from "./encrypted-fields";

// Função para gerar um hash fixo a partir dos dados (utilizando SHA-256)
function generateHash(data: string): Buffer {
    const hash = createHash("sha256");
    hash.update(data, "utf8");

    return hash.digest();
}

// Função para criptografar os dados e retornar uma string codificada
function encryptData(data: string): string {
    const fixedIV = generateHash(data);
    const cipher = createCipheriv(
        "aes-256-gcm",
        process.env.SECRET_KEY,
        fixedIV,
    );

    const encrypted = Buffer.concat([
        cipher.update(data, "utf8"),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    // Combine o IV, a tag e o texto cifrado em uma única string codificada
    const encryptedData = Buffer.concat([fixedIV, tag, encrypted]).toString(
        "base64",
    );

    return encryptedData;
}

// Função para descriptografar os dados a partir da string codificada
function decryptData(encryptedData: string): string {
    const encryptedBuffer = Buffer.from(encryptedData, "base64");

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

    return decrypted.toString("utf8");
}

function manageEncryption(
    fields: {
        fieldName: string;
        typeName: string;
    }[],
    data: unknown,
    mode: "encrypt" | "decrypt",
): void {
    fields.forEach((field) => {
        const { fieldName } = field;
        const fieldValue = data[fieldName];
        if (!fieldValue) return;

        // console.log(`data[${fieldName}]:`, data[fieldName]);

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

                            if (!data[fieldName][key]) return;
                            // eslint-disable-next-line no-param-reassign
                            data[fieldName][key] =
                                mode === "encrypt"
                                    ? encryptData(data[fieldName][key])
                                    : decryptData(data[fieldName][key]);
                        });
                        break;
                    case true:
                        // eslint-disable-next-line no-param-reassign
                        data[fieldName] =
                            mode === "encrypt"
                                ? encryptData(data[fieldName])
                                : decryptData(data[fieldName]);
                        break;
                    default:
                }

                break;
            case true:
                // eslint-disable-next-line no-param-reassign
                data[fieldName] = data[fieldName].map((item: string) =>
                    mode === "encrypt" ? encryptData(item) : decryptData(item),
                );
                break;
            default:
                break;
        }

        // console.log(`data[${fieldName}]:`, data[fieldName]);
    });
}

function resolveEncryptedArgs(
    args: unknown,
    fields: {
        fieldName: string;
        typeName: string;
    }[],
): void {
    // console.log("args before:", ConvertToJson(args));

    const { where } = args as { where: unknown };
    const { AND, NOT, OR } =
        (where as { AND: unknown; NOT: unknown; OR: unknown }) ?? {};

    // criptografar a pesquisa para o banco de dados passando o argumento where

    const manageArrayEncryption = (array: unknown[]) => {
        array.forEach((item) => {
            if (item && typeof item === "object")
                manageEncryption(fields, item, "encrypt");
        });
    };

    if (where) manageEncryption(fields, where, "encrypt");
    if (AND) manageArrayEncryption(AND as unknown[]);
    if (NOT) manageArrayEncryption(NOT as unknown[]);
    if (OR) manageArrayEncryption(OR as unknown[]);

    // console.log("args after:", ConvertToJson(args));
}

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.PRISMA_MIGRATE,
        },
    },
}).$extends({
    query: {
        $allModels: {
            // eslint-disable-next-line consistent-return
            $allOperations({ args, model, query, operation }) {
                switch (operation) {
                    case "create":
                    case "createMany":
                    case "update":
                    case "updateMany":
                    case "upsert":
                    case "delete":
                    case "deleteMany":
                        // console.log("write");
                        return writeReplicaPrisma[model][operation](
                            args,
                            model,
                            query,
                            operation,
                        );
                    case "findFirst":
                    case "findFirstOrThrow":
                    case "findMany":
                    case "findUnique":
                    case "findUniqueOrThrow":
                        // console.log("read");
                        return readReplicaPrisma[model][operation](
                            args,
                            model,
                            query,
                            operation,
                        );
                    default:
                        // console.log("default");
                        return query(args);
                }
            },
        },
    },
});

const writeReplicaPrisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.PRISMA_WRITE,
        },
    },
}).$extends({
    name: "writeReplica",
    query: {
        $allModels: {
            // Métodos de escrita personalizados
            create({ args, model, query }) {
                // console.log("args:", ConvertToJson(args));
                const { data } = args;
                const fields = prismaEncryptFields[model];

                if (fields) manageEncryption(fields, data, "encrypt");

                return query({ ...args });
            },

            update({ args, model, query }) {
                const { data } = args;
                const fields = prismaEncryptFields[model];

                if (fields) {
                    resolveEncryptedArgs(args, fields);
                    manageEncryption(fields, data, "encrypt");
                }

                return query({ ...args });
            },

            createMany({ args, model, query }) {
                const { data } = args;
                const fields = prismaEncryptFields[model];

                if (fields) {
                    if (Array.isArray(data))
                        data.forEach((entry: unknown) => {
                            manageEncryption(fields, entry, "encrypt");
                        });
                    else manageEncryption(fields, data, "encrypt");
                }

                return query({ ...args });
            },

            updateMany({ args, model, query }) {
                const { data } = args;
                const fields = prismaEncryptFields[model];

                if (fields) {
                    resolveEncryptedArgs(args, fields);

                    if (Array.isArray(data))
                        data.forEach((entry: unknown) => {
                            manageEncryption(fields, entry, "encrypt");
                        });
                    else manageEncryption(fields, data, "encrypt");
                }

                return query({ ...args });
            },

            upsert({ args, model, query }) {
                const { create, update } = args;
                const fields = prismaEncryptFields[model];

                if (fields) {
                    resolveEncryptedArgs(args, fields);

                    if (create) manageEncryption(fields, create, "encrypt");

                    if (update) manageEncryption(fields, update, "encrypt");
                }

                return query({ ...args });
            },
        },
    },
});

const readReplicaPrisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.PRISMA_READ,
        },
    },
}).$extends({
    name: "readReplica",
    query: {
        $allModels: {
            async $allOperations({ args, model, query }) {
                // pegar os campos que precisam ser criptografados para o model
                const fields = prismaEncryptFields[model];

                // criptografar a pesquisa para o banco de dados passando
                if (fields) resolveEncryptedArgs(args, fields);
                console.log("fields:", fields);

                // pesquisar no banco de dados
                const result = await query(args);
                // console.log("result before:", result);

                // descriptografar os campos criptografados no resultado da pesquisa
                if (fields && result) {
                    console.log("entrou");
                    if (Array.isArray(result))
                        // caso seja utilizado o findMany
                        result.forEach((entry: unknown) => {
                            manageEncryption(fields, entry, "decrypt");
                        });
                    else manageEncryption(fields, result, "decrypt");
                }
                // console.log("result after:", result);

                return result;
            },
        },
    },
});

export { prisma };
