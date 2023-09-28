import { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "@prisma/sdk";

import { prismaEncryptModels } from "./encrypted-models";
import { EncryptionMethods } from "./encryption-methods";

interface PrismaCryptoOptions {
    direct?: string;
    write?: string;
    read?: string;
    debug?: boolean;
}

export class PrismaCrypto {
    readonly direct: string;
    readonly write: string;
    readonly read: string;
    private debugMode = false;

    constructor({ debug, direct, read, write }: PrismaCryptoOptions = {}) {
        if (debug) {
            logger.info("[PrismaCrypto] debug mode is active");
            this.debugMode = debug;
        }
        this.direct = direct
            ? direct
            : this.getMyVar("PRISMA_CRYPTO_DIRECT_DB");
        this.write = write ? write : this.getMyVar("PRISMA_CRYPTO_WRITE_DB");
        this.read = read ? read : this.getMyVar("PRISMA_CRYPTO_READ_DB");

        this.initPrisma();
    }

    private prisma: PrismaClient;

    private getMyVar(env_var: string) {
        return process.env[env_var];
    }

    private static convertToJson(variable: any): string {
        return JSON.stringify(variable, null, 2);
    }

    private initPrisma() {
        const prismaOptions: Prisma.PrismaClientOptions = {
            datasources: {
                db: {
                    url: this.direct,
                },
            },
            log: [
                {
                    emit: "event",
                    level: "query",
                },
            ],
        };

        if (!this.debugMode) delete prismaOptions.log;

        const prisma = new PrismaClient(prismaOptions).$extends({
            query: {
                $allModels: {
                    // eslint-disable-next-line consistent-return
                    $allOperations: ({ args, model, query, operation }) => {
                        switch (operation) {
                            case "create":
                            case "createMany":
                            case "update":
                            case "updateMany":
                            case "upsert":
                            case "delete":
                            case "deleteMany":
                                if (this.debugMode)
                                    logger.info(
                                        "[PrismaClient] write instance",
                                    );
                                return writeReplicaPrisma[model][operation](
                                    args,
                                    model,
                                    query,
                                    operation,
                                );
                            case "count":
                            case "groupBy":
                            case "aggregate":
                            case "findFirst":
                            case "findFirstOrThrow":
                            case "findMany":
                            case "findUnique":
                            case "findUniqueOrThrow":
                                if (this.debugMode)
                                    logger.info("[PrismaClient] read instance");
                                return readReplicaPrisma[model][operation](
                                    args,
                                    model,
                                    query,
                                    operation,
                                );
                            default:
                                if (this.debugMode)
                                    logger.info(
                                        "[PrismaClient] no instance selected",
                                    );
                                return;
                        }
                    },
                },
            },
        }) as any;

        const writeReplicaOptions: Prisma.PrismaClientOptions = {
            datasources: {
                db: {
                    url: this.write,
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
                    create: ({ args, model, query }) => {
                        if (this.debugMode)
                            logger.info(
                                `[${model + ".create"}] args before:`,
                                PrismaCrypto.convertToJson(args),
                            );
                        const { data: dataToEncrypt } = args;

                        const fieldsToManage = prismaEncryptModels[model];
                        if (this.debugMode)
                            logger.info(
                                "fieldsToManage:",
                                PrismaCrypto.convertToJson(fieldsToManage),
                            );

                        if (fieldsToManage)
                            EncryptionMethods.manageEncryption({
                                fieldsToManage: JSON.parse(
                                    JSON.stringify(fieldsToManage),
                                ),
                                dataToEncrypt,
                                manageMode: "encrypt",
                            });

                        if (this.debugMode)
                            logger.info(
                                `[${model + ".create"}] args after:`,
                                PrismaCrypto.convertToJson(args),
                            );
                        return query({ ...args });
                    },

                    update: ({ args, model, query }) => {
                        if (this.debugMode)
                            logger.info(
                                `[${model + ".update"}] args before:`,
                                PrismaCrypto.convertToJson(args),
                            );
                        const { data: dataToEncrypt } = args;
                        const fieldsToManage = prismaEncryptModels[model];

                        if (fieldsToManage) {
                            EncryptionMethods.resolveEncryptedArgs({
                                whereArgs: args,
                                fieldsToManage: JSON.parse(
                                    JSON.stringify(fieldsToManage),
                                ),
                            });
                            EncryptionMethods.manageEncryption({
                                fieldsToManage: JSON.parse(
                                    JSON.stringify(fieldsToManage),
                                ),
                                dataToEncrypt,
                                manageMode: "encrypt",
                            });
                        }

                        if (this.debugMode)
                            logger.info(
                                `[${model + ".update"}] args after:`,
                                PrismaCrypto.convertToJson(args),
                            );
                        return query({ ...args });
                    },

                    createMany: ({ args, model, query }) => {
                        if (this.debugMode)
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
                                        fieldsToManage: JSON.parse(
                                            JSON.stringify(fieldsToManage),
                                        ),
                                        dataToEncrypt: entry,
                                        manageMode: "encrypt",
                                    });
                                });
                            else
                                EncryptionMethods.manageEncryption({
                                    fieldsToManage: JSON.parse(
                                        JSON.stringify(fieldsToManage),
                                    ),
                                    dataToEncrypt,
                                    manageMode: "encrypt",
                                });
                        }

                        if (this.debugMode)
                            logger.info(
                                `[${model + ".createMany"}] args after:`,
                                PrismaCrypto.convertToJson(args),
                            );
                        return query({ ...args });
                    },

                    updateMany: ({ args, model, query }) => {
                        if (this.debugMode)
                            logger.info(
                                `[${model + ".updateMany"}] args before:`,
                                PrismaCrypto.convertToJson(args),
                            );
                        const { data: dataToEncrypt, where: whereArgs } = args;
                        const fieldsToManage = prismaEncryptModels[model];

                        if (fieldsToManage) {
                            EncryptionMethods.resolveEncryptedArgs({
                                whereArgs,
                                fieldsToManage: JSON.parse(
                                    JSON.stringify(fieldsToManage),
                                ),
                            });

                            if (Array.isArray(dataToEncrypt))
                                dataToEncrypt.forEach((entry: unknown) => {
                                    EncryptionMethods.manageEncryption({
                                        fieldsToManage: JSON.parse(
                                            JSON.stringify(fieldsToManage),
                                        ),
                                        dataToEncrypt: entry,
                                        manageMode: "encrypt",
                                    });
                                });
                            else
                                EncryptionMethods.manageEncryption({
                                    fieldsToManage: JSON.parse(
                                        JSON.stringify(fieldsToManage),
                                    ),
                                    dataToEncrypt,
                                    manageMode: "encrypt",
                                });
                        }

                        if (this.debugMode)
                            logger.info(
                                `[${model + ".updateMany"}] args after:`,
                                PrismaCrypto.convertToJson(args),
                            );
                        return query({ ...args });
                    },

                    upsert: ({ args, model, query }) => {
                        if (this.debugMode)
                            logger.info(
                                `[${model + ".upsert"}] args before:`,
                                PrismaCrypto.convertToJson(args),
                            );
                        const { create, update, where: whereArgs } = args;
                        const fieldsToManage = prismaEncryptModels[model];

                        if (fieldsToManage) {
                            EncryptionMethods.resolveEncryptedArgs({
                                whereArgs,
                                fieldsToManage: JSON.parse(
                                    JSON.stringify(fieldsToManage),
                                ),
                            });

                            if (create)
                                EncryptionMethods.manageEncryption({
                                    fieldsToManage: JSON.parse(
                                        JSON.stringify(fieldsToManage),
                                    ),
                                    dataToEncrypt: create,
                                    manageMode: "encrypt",
                                });

                            if (update)
                                EncryptionMethods.manageEncryption({
                                    fieldsToManage: JSON.parse(
                                        JSON.stringify(fieldsToManage),
                                    ),
                                    dataToEncrypt: update,
                                    manageMode: "encrypt",
                                });
                        }

                        if (this.debugMode)
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
                    url: this.read,
                },
            },
        };

        const readReplicaPrisma = new PrismaClient(readReplicaOptions).$extends(
            {
                name: "readReplica",
                query: {
                    $allModels: {
                        $allOperations: async ({
                            args,
                            model,
                            query,
                            operation,
                        }) => {
                            const { where: whereArgs, orderBy } = args as {
                                where: unknown;
                                orderBy: unknown;
                            };
                            if (this.debugMode)
                                logger.info(
                                    `[${
                                        model + "." + operation
                                    }] whereArgs before:`,
                                    whereArgs,
                                );
                            const fieldsToManage = prismaEncryptModels[model];

                            if (whereArgs && fieldsToManage)
                                EncryptionMethods.resolveEncryptedArgs({
                                    whereArgs,
                                    fieldsToManage: JSON.parse(
                                        JSON.stringify(fieldsToManage),
                                    ),
                                });

                            if (this.debugMode)
                                logger.info(
                                    `[${
                                        model + "." + operation
                                    }] whereArgs after:`,
                                    whereArgs,
                                );

                            if (orderBy && fieldsToManage) {
                                // se dentro do objeto do orderBy houver algum campo criptografado, retornar erro
                                const fieldsNameToManage = fieldsToManage.map(
                                    (field) => field.fieldName,
                                );

                                Object.keys(orderBy).forEach((field) => {
                                    const isCryproOrderBy =
                                        fieldsNameToManage.includes(field);

                                    if (isCryproOrderBy) {
                                        logger.error(
                                            `The field ${field} is encrypted, so it cannot be used in the orderBy clause.`,
                                        );
                                        process.exit(1);
                                    }
                                });
                            }

                            const result = await query(args);
                            if (this.debugMode)
                                logger.info(
                                    `[${
                                        model + "." + operation
                                    }] result before:`,
                                    PrismaCrypto.convertToJson(result),
                                );

                            // descriptografar os campos criptografados no resultado da pesquisa
                            if (fieldsToManage && result) {
                                if (Array.isArray(result))
                                    // caso seja utilizado o findMany
                                    result.forEach((entry: unknown) => {
                                        EncryptionMethods.manageEncryption({
                                            fieldsToManage: JSON.parse(
                                                JSON.stringify(fieldsToManage),
                                            ),
                                            dataToEncrypt: entry,
                                            manageMode: "decrypt",
                                        });
                                    });
                                else
                                    EncryptionMethods.manageEncryption({
                                        fieldsToManage: JSON.parse(
                                            JSON.stringify(fieldsToManage),
                                        ),
                                        dataToEncrypt: result,
                                        manageMode: "decrypt",
                                    });
                            }

                            if (this.debugMode)
                                logger.info(
                                    `[${
                                        model + "." + operation
                                    }] result after:`,
                                    PrismaCrypto.convertToJson(result),
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
