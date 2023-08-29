import { it, describe, expect, chai, beforeAll, vi } from "vitest";

import { PrismaClient } from "@prisma/client";

import { PrismaCrypto } from "../dist/prisma-client";

const convertToJson = (variable: any): string => {
    return JSON.stringify(variable, null, 2);
};

let prisma: PrismaClient;

describe("Prisma Crypto Tests", () => {
    beforeAll(async () => {
        prisma = new PrismaCrypto({}).getPrismaClient();
    });

    it("should be able to encrypt new users with cellphones", async () => {
        try {
            const output = await prisma.user.create({
                data: {
                    email: "test@test.com",
                    name: "test",
                    password: "test",
                    CellPhone: {
                        // connectOrCreate: {
                        //     where: {
                        //         number: "75988893409",
                        //     },
                        //     create: {
                        //         number: "75988893409",
                        //     },
                        // },
                        // connect: {
                        //     number: "75988893409",
                        // },
                        // create: {
                        //     number: "75988893409",
                        // },
                        createMany: {
                            data: [
                                {
                                    number: "75988893409",
                                },
                                {
                                    number: "275988893409",
                                },
                                {
                                    number: "375988893409",
                                },
                            ],
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

    it("should be able to decrypt users with cellphones", async () => {
        try {
            const output = await prisma.user.findFirst({
                where: {
                    email: "test@test.com",
                },
                select: {
                    name: true,
                    CellPhone: true,
                },
            });
            console.log("output:", output);
            expect(output).toBeDefined();
            expect(output).toBeTruthy();
        } catch (error) {
            chai.assert.fail(convertToJson(error));
        }
    });

    it("should not be able to use encrypted fields on orderBy clause", async () => {
        try {
            const mockStderr = vi
                .spyOn(console, "error")
                .mockImplementation(() => true);
            const mockExit = vi
                .spyOn(process, "exit")
                .mockImplementation(() => true as never);

            await prisma.user.findFirst({
                where: {
                    email: "test@test.com",
                },
                select: {
                    name: true,
                    CellPhone: true,
                },
                orderBy: {
                    email: "asc",
                },
            });
            // console.error("Sua mensagem de erro aqui"); // Para depuração
            console.log("mockStderr:", mockStderr.mock.calls); // Para depuração
            console.log("mockExit:", mockExit.mock.calls); // Para depuração

            expect(mockStderr).toHaveBeenCalledWith(
                expect.stringContaining(
                    "The field email is encrypted, so it cannot be used in the orderBy clause.",
                ),
            );
            expect(mockExit).toHaveBeenCalledWith(1);

            mockStderr.mockRestore();
            mockExit.mockRestore();
        } catch (error) {
            chai.assert.fail(convertToJson(error));
        }
    });

    it("should not crash if we don't have an orderBy clause", async () => {
        try {
            const output = await prisma.user.findFirst({
                where: {
                    email: "test@test.com",
                },
                select: {
                    name: true,
                    CellPhone: true,
                },
            });

            expect(output).toBeDefined();
        } catch (error) {
            chai.assert.fail(convertToJson(error));
        }
    });
});
