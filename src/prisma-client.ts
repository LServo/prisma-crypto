/* eslint-disable no-case-declarations */

import { PrismaClient } from "@prisma/client";
import { logger } from "@prisma/sdk";

import { prismaEncryptModels } from "./encrypted-models";
import { EncryptionMethods } from "./encryption-methods";

const convertToJson = (variable: any): string => {
    return JSON.stringify(variable, null, 2);
};

const debugMode = process.env.DEBUG_MODE === "true";

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
                        if (debugMode) logger.info("write");
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
                        if (debugMode) logger.info("read");
                        return readReplicaPrisma[model][operation](
                            args,
                            model,
                            query,
                            operation,
                        );
                    default:
                        if (debugMode) logger.info("default");
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
                if (debugMode) logger.info(model + ".create");
                if (debugMode) logger.info("args before:", convertToJson(args));
                const { data: dataToEncrypt } = args;

                const fieldsToManage = prismaEncryptModels[model];
                if (debugMode)
                    logger.info(
                        "fieldsToManage:",
                        convertToJson(fieldsToManage),
                    );

                if (fieldsToManage)
                    EncryptionMethods.manageEncryption({
                        fieldsToManage,
                        dataToEncrypt,
                        manageMode: "encrypt",
                    });

                if (debugMode) logger.info("args after:", convertToJson(args));
                return query({ ...args });
            },

            update({ args, model, query }) {
                if (debugMode) logger.info(model + ".update");
                if (debugMode) logger.info("args before:", convertToJson(args));
                const { data: dataToEncrypt } = args;
                const fieldsToManage = prismaEncryptModels[model];

                if (fieldsToManage) {
                    EncryptionMethods.resolveEncryptedArgs({
                        whereArgs: args,
                        fieldsToManage,
                    });
                    EncryptionMethods.manageEncryption({
                        fieldsToManage,
                        dataToEncrypt,
                        manageMode: "encrypt",
                    });
                }

                if (debugMode) logger.info("args after:", convertToJson(args));
                return query({ ...args });
            },

            createMany({ args, model, query }) {
                if (debugMode)
                    logger.info(
                        `[${model + ".createMany"}] args before:`,
                        convertToJson(args),
                    );
                const { data: dataToEncrypt } = args;
                const fieldsToManage = prismaEncryptModels[model];

                if (fieldsToManage) {
                    if (Array.isArray(dataToEncrypt))
                        dataToEncrypt.forEach((entry: unknown) => {
                            EncryptionMethods.manageEncryption({
                                fieldsToManage,
                                dataToEncrypt: entry,
                                manageMode: "encrypt",
                            });
                        });
                    else
                        EncryptionMethods.manageEncryption({
                            fieldsToManage,
                            dataToEncrypt,
                            manageMode: "encrypt",
                        });
                }

                if (debugMode)
                    logger.info(
                        `[${model + ".createMany"}] args after:`,
                        convertToJson(args),
                    );
                return query({ ...args });
            },

            updateMany({ args, model, query }) {
                if (debugMode)
                    logger.info(
                        `[${model + ".updateMany"}] args before:`,
                        convertToJson(args),
                    );
                const { data: dataToEncrypt, where: whereArgs } = args;
                const fieldsToManage = prismaEncryptModels[model];

                if (fieldsToManage) {
                    EncryptionMethods.resolveEncryptedArgs({
                        whereArgs,
                        fieldsToManage,
                    });

                    if (Array.isArray(dataToEncrypt))
                        dataToEncrypt.forEach((entry: unknown) => {
                            EncryptionMethods.manageEncryption({
                                fieldsToManage,
                                dataToEncrypt: entry,
                                manageMode: "encrypt",
                            });
                        });
                    else
                        EncryptionMethods.manageEncryption({
                            fieldsToManage,
                            dataToEncrypt,
                            manageMode: "encrypt",
                        });
                }

                if (debugMode)
                    logger.info(
                        `[${model + ".updateMany"}] args after:`,
                        convertToJson(args),
                    );
                return query({ ...args });
            },

            upsert({ args, model, query }) {
                if (debugMode)
                    logger.info(
                        `[${model + ".upsert"}] args before:`,
                        convertToJson(args),
                    );
                const { create, update, where: whereArgs } = args;
                const fieldsToManage = prismaEncryptModels[model];

                if (fieldsToManage) {
                    EncryptionMethods.resolveEncryptedArgs({
                        whereArgs,
                        fieldsToManage,
                    });

                    if (create)
                        EncryptionMethods.manageEncryption({
                            fieldsToManage,
                            dataToEncrypt: create,
                            manageMode: "encrypt",
                        });

                    if (update)
                        EncryptionMethods.manageEncryption({
                            fieldsToManage,
                            dataToEncrypt: update,
                            manageMode: "encrypt",
                        });
                }

                if (debugMode)
                    logger.info(
                        `[${model + ".upsert"}] args after:`,
                        convertToJson(args),
                    );
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
            async $allOperations({ args, model, query, operation }) {
                const { where: whereArgs } = args as { where: unknown };
                if (debugMode)
                    logger.info(
                        `[${model + "." + operation}] whereArgs before:`,
                        whereArgs,
                    );
                const fieldsToManage = prismaEncryptModels[model];

                if (fieldsToManage)
                    EncryptionMethods.resolveEncryptedArgs({
                        whereArgs,
                        fieldsToManage,
                    });

                if (debugMode)
                    logger.info(
                        `[${model + "." + operation}] whereArgs after:`,
                        whereArgs,
                    );
                const result = await query(args);
                if (debugMode)
                    logger.info(
                        `[${model + "." + operation}] result before:`,
                        result,
                    );

                // descriptografar os campos criptografados no resultado da pesquisa
                if (fieldsToManage && result) {
                    if (Array.isArray(result))
                        // caso seja utilizado o findMany
                        result.forEach((entry: unknown) => {
                            EncryptionMethods.manageEncryption({
                                fieldsToManage,
                                dataToEncrypt: entry,
                                manageMode: "decrypt",
                            });
                        });
                    else
                        EncryptionMethods.manageEncryption({
                            fieldsToManage,
                            dataToEncrypt: result,
                            manageMode: "decrypt",
                        });
                }

                if (debugMode)
                    logger.info(
                        `[${model + "." + operation}] result before:`,
                        result,
                    );
                return result;
            },
        },
    },
});

export { prisma };
