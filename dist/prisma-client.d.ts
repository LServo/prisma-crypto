import { Prisma, PrismaClient } from "@prisma/client";
interface PrismaCryptoOptions {
    direct?: string;
    write?: string;
    read?: string;
    debug?: boolean;
}
export declare class PrismaCrypto {
    readonly direct: string;
    readonly write: string;
    readonly read: string;
    private debugMode;
    constructor({ debug, direct, read, write }?: PrismaCryptoOptions);
    private prisma;
    private getMyVar;
    private static convertToJson;
    private initPrisma;
    getPrismaClient(): PrismaClient<Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
export {};
