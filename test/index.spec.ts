import { it, describe, expect, chai, beforeAll } from "vitest";

// import { prisma } from "../dist/prisma-client";
import { PrismaClient } from "@prisma/client";

import { PrismaCrypto } from "../dist/prisma-client";

const convertToJson = (variable: any): string => {
    return JSON.stringify(variable, null, 2);
};

let prisma: PrismaClient;

describe("Prisma Crypto Tests", () => {
    beforeAll(async () => {
        prisma = new PrismaCrypto().getPrismaClient();
    });

    it("should be able to encrypt new users", async () => {
        try {
            const output = await prisma.user.create({
                data: {
                    email: "test@test.com",
                    name: "test",
                    password: "test",
                    CellPhone: {
                        connectOrCreate: {
                            where: {
                                number: "123456789",
                            },
                            create: {
                                number: "123456789",
                            },
                        },
                    },
                },
            });
            console.log("output:", output);
            expect(output).toBeDefined();
            expect(output).toBeTruthy();
        } catch (error) {
            chai.assert.fail(convertToJson(error));
        }
    });

    it("should be able to decrypt existent users", async () => {});

    it("should be able to decrypt users cellphones", async () => {});
});
