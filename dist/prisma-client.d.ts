import { Prisma, PrismaClient } from "@prisma/client";
export declare class PrismaCrypto {
    private prisma;
    private static debugMode;
    constructor();
    private static getMyVar;
    private static convertToJson;
    private initPrisma;
    getPrismaClient(): PrismaClient<Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
