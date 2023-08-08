/* eslint-disable no-case-declarations */

import { PrismaClient } from "@prisma/client";

// eslint-disable-next-line import/no-unresolved, import/extensions
import { prismaEncryptModels } from "./encrypted-models";
import { EncryptionMethods } from "./encryption-methods";
import { PrismaCrypto } from "./prisma-crypto";

const convertToJson = (variable: any): string => {
    return JSON.stringify(variable, null, 2);
};

const {
    manageEncryption,
    resolveEncryptedArgs,
}: PrismaCrypto.EncryptionMethods = new EncryptionMethods();

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
                console.log("args before:", convertToJson(args));
                const { data: dataToEncrypt } = args;
                console.log("dataToEncrypt:", convertToJson(dataToEncrypt));
                console.log("prismaEncryptModels:", prismaEncryptModels);
                console.log("model:", model);
                const fieldsToManage = prismaEncryptModels[model];
                console.log("fieldsToManage:", convertToJson(fieldsToManage));

                if (fieldsToManage)
                    manageEncryption({
                        fieldsToManage,
                        dataToEncrypt,
                        manageMode: "encrypt",
                    });

                console.log("args after:", convertToJson(args));

                return query({ ...args });
            },

            update({ args, model, query }) {
                const { data: dataToEncrypt } = args;
                const fieldsToManage = prismaEncryptModels[model];

                if (fieldsToManage) {
                    resolveEncryptedArgs({
                        whereArgs: args,
                        fieldsToManage,
                    });
                    manageEncryption({
                        fieldsToManage,
                        dataToEncrypt,
                        manageMode: "encrypt",
                    });
                }

                return query({ ...args });
            },

            createMany({ args, model, query }) {
                const { data: dataToEncrypt } = args;
                const fieldsToManage = prismaEncryptModels[model];

                if (fieldsToManage) {
                    if (Array.isArray(dataToEncrypt))
                        dataToEncrypt.forEach((entry: unknown) => {
                            manageEncryption({
                                fieldsToManage,
                                dataToEncrypt: entry,
                                manageMode: "encrypt",
                            });
                        });
                    else
                        manageEncryption({
                            fieldsToManage,
                            dataToEncrypt,
                            manageMode: "encrypt",
                        });
                }

                return query({ ...args });
            },

            updateMany({ args, model, query }) {
                const { data: dataToEncrypt, where: whereArgs } = args;
                const fieldsToManage = prismaEncryptModels[model];

                if (fieldsToManage) {
                    resolveEncryptedArgs({ whereArgs, fieldsToManage });

                    if (Array.isArray(dataToEncrypt))
                        dataToEncrypt.forEach((entry: unknown) => {
                            manageEncryption({
                                fieldsToManage,
                                dataToEncrypt: entry,
                                manageMode: "encrypt",
                            });
                        });
                    else
                        manageEncryption({
                            fieldsToManage,
                            dataToEncrypt,
                            manageMode: "encrypt",
                        });
                }

                return query({ ...args });
            },

            upsert({ args, model, query }) {
                const { create, update, where: whereArgs } = args;
                const fieldsToManage = prismaEncryptModels[model];

                if (fieldsToManage) {
                    resolveEncryptedArgs({ whereArgs, fieldsToManage });

                    if (create)
                        manageEncryption({
                            fieldsToManage,
                            dataToEncrypt: create,
                            manageMode: "encrypt",
                        });

                    if (update)
                        manageEncryption({
                            fieldsToManage,
                            dataToEncrypt: update,
                            manageMode: "encrypt",
                        });
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
                const { where: whereArgs } = args as { where: unknown };
                const fieldsToManage = prismaEncryptModels[model];

                if (fieldsToManage)
                    resolveEncryptedArgs({ whereArgs, fieldsToManage });

                const result = await query(args);

                // descriptografar os campos criptografados no resultado da pesquisa
                if (fieldsToManage && result) {
                    if (Array.isArray(result))
                        // caso seja utilizado o findMany
                        result.forEach((entry: unknown) => {
                            manageEncryption({
                                fieldsToManage,
                                dataToEncrypt: entry,
                                manageMode: "decrypt",
                            });
                        });
                    else
                        manageEncryption({
                            fieldsToManage,
                            dataToEncrypt: result,
                            manageMode: "decrypt",
                        });
                }

                return result;
            },
        },
    },
});

export { prisma };
