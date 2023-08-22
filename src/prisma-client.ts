import { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "@prisma/sdk";

import { prismaEncryptModels } from "./encrypted-models";
import { EncryptionMethods } from "./encryption-methods";

export class PrismaCrypto {
    private prisma: PrismaClient;
    private static debugMode =
        PrismaCrypto.getMyVar("PRISMA_CRYPTO_DEBUG") === "true";

    constructor() {
        this.initPrisma();
    }

    private static getMyVar(env_var: string) {
        return process.env[env_var];
    }

    private static convertToJson(variable: any): string {
        return JSON.stringify(variable, null, 2);
    }

    private initPrisma() {
        const prismaOptions: Prisma.PrismaClientOptions = {
            datasources: {
                db: {
                    url: PrismaCrypto.getMyVar("PRISMA_CRYPTO_DIRECT_DB"),
                },
            },
            log: [
                {
                    emit: "event",
                    level: "query",
                },
            ],
        };

        if (!PrismaCrypto.debugMode) delete prismaOptions.log;

        const prisma = new PrismaClient(prismaOptions).$extends({
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
                                if (PrismaCrypto.debugMode)
                                    logger.info(
                                        "[PrismaCLient] write instance",
                                    );
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
                                if (PrismaCrypto.debugMode)
                                    logger.info("[PrismaCLient] read instance");
                                return readReplicaPrisma[model][operation](
                                    args,
                                    model,
                                    query,
                                    operation,
                                );
                            default:
                                if (PrismaCrypto.debugMode)
                                    logger.info(
                                        "[PrismaCLient] default instance",
                                    );
                                return query(args);
                        }
                    },
                },
            },
        }) as any;

        const writeReplicaOptions: Prisma.PrismaClientOptions = {
            datasources: {
                db: {
                    url: PrismaCrypto.getMyVar("PRISMA_CRYPTO_WRITE_DB"),
                },
            },
        };

        const writeReplicaPrisma = new PrismaClient(
            writeReplicaOptions,
        ).$extends({
            name: "writeReplica",
            query: {
                $allModels: {
                    // Métodos de escrita personalizados
                    create({ args, model, query }) {
                        if (PrismaCrypto.debugMode)
                            logger.info(
                                `[${model + ".create"}] args before:`,
                                PrismaCrypto.convertToJson(args),
                            );
                        const { data: dataToEncrypt } = args;

                        const fieldsToManage = prismaEncryptModels[model];
                        if (PrismaCrypto.debugMode)
                            logger.info(
                                "fieldsToManage:",
                                PrismaCrypto.convertToJson(fieldsToManage),
                            );

                        if (fieldsToManage)
                            EncryptionMethods.manageEncryption({
                                fieldsToManage,
                                dataToEncrypt,
                                manageMode: "encrypt",
                            });

                        if (PrismaCrypto.debugMode)
                            logger.info(
                                `[${model + ".create"}] args after:`,
                                PrismaCrypto.convertToJson(args),
                            );
                        return query({ ...args });
                    },

                    update({ args, model, query }) {
                        if (PrismaCrypto.debugMode)
                            logger.info(
                                `[${model + ".update"}] args before:`,
                                PrismaCrypto.convertToJson(args),
                            );
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

                        if (PrismaCrypto.debugMode)
                            logger.info(
                                `[${model + ".update"}] args after:`,
                                PrismaCrypto.convertToJson(args),
                            );
                        return query({ ...args });
                    },

                    createMany({ args, model, query }) {
                        if (PrismaCrypto.debugMode)
                            logger.info(
                                `[${model + ".createMany"}] args before:`,
                                PrismaCrypto.convertToJson(args),
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

                        if (PrismaCrypto.debugMode)
                            logger.info(
                                `[${model + ".createMany"}] args after:`,
                                PrismaCrypto.convertToJson(args),
                            );
                        return query({ ...args });
                    },

                    updateMany({ args, model, query }) {
                        if (PrismaCrypto.debugMode)
                            logger.info(
                                `[${model + ".updateMany"}] args before:`,
                                PrismaCrypto.convertToJson(args),
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

                        if (PrismaCrypto.debugMode)
                            logger.info(
                                `[${model + ".updateMany"}] args after:`,
                                PrismaCrypto.convertToJson(args),
                            );
                        return query({ ...args });
                    },

                    upsert({ args, model, query }) {
                        if (PrismaCrypto.debugMode)
                            logger.info(
                                `[${model + ".upsert"}] args before:`,
                                PrismaCrypto.convertToJson(args),
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

                        if (PrismaCrypto.debugMode)
                            logger.info(
                                `[${model + ".upsert"}] args after:`,
                                PrismaCrypto.convertToJson(args),
                            );
                        return query({ ...args });
                    },
                },
            },
        });

        const readReplicaOptions: Prisma.PrismaClientOptions = {
            datasources: {
                db: {
                    url: PrismaCrypto.getMyVar("PRISMA_CRYPTO_READ_DB"),
                },
            },
        };

        const readReplicaPrisma = new PrismaClient(readReplicaOptions).$extends(
            {
                name: "readReplica",
                query: {
                    $allModels: {
                        async $allOperations({
                            args,
                            model,
                            query,
                            operation,
                        }) {
                            const { where: whereArgs } = args as {
                                where: unknown;
                            };
                            if (PrismaCrypto.debugMode)
                                logger.info(
                                    `[${
                                        model + "." + operation
                                    }] whereArgs before:`,
                                    whereArgs,
                                );
                            const fieldsToManage = prismaEncryptModels[model];

                            if (fieldsToManage)
                                EncryptionMethods.resolveEncryptedArgs({
                                    whereArgs,
                                    fieldsToManage,
                                });

                            if (PrismaCrypto.debugMode)
                                logger.info(
                                    `[${
                                        model + "." + operation
                                    }] whereArgs after:`,
                                    whereArgs,
                                );
                            const result = await query(args);
                            if (PrismaCrypto.debugMode)
                                logger.info(
                                    `[${
                                        model + "." + operation
                                    }] result before:`,
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

                            if (PrismaCrypto.debugMode)
                                logger.info(
                                    `[${
                                        model + "." + operation
                                    }] result after:`,
                                    result,
                                );
                            return result;
                        },
                    },
                },
            },
        );
        this.prisma = prisma;
    }

    public getPrismaClient() {
        return this.prisma;
    }
}
