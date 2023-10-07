import { execSync } from "child_process";
import { it, describe, expect, chai, beforeAll, vi } from "vitest";

import { PrismaClient } from "@prisma/client";

import { PrismaCrypto } from "../dist/prisma-client";

const convertToJson = (variable: any): string => {
    return JSON.stringify(variable, null, 2);
};

let prisma: PrismaClient;

describe("Prisma Crypto Tests", () => {
    beforeAll(async () => {
        console.log("Resetting database...");
        execSync(
            "npx prisma migrate reset --force --skip-seed --schema=test/schema.prisma && npx prisma generate --schema=test/schema.prisma",
        );
        prisma = new PrismaCrypto({
            debug: true,
        }).getPrismaClient();
    });

    it("should be able to encrypt new users with cellphones", async () => {
        try {
            const output = await prisma.user.create({
                data: {
                    id: "4b9d5403-c234-4b16-97a1-0e04e446b016",
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
                                    mobile_carrier: "TIM",
                                },
                                {
                                    number: "275988893409",
                                    mobile_carrier: "VIVO",
                                },
                                {
                                    number: "375988893409",
                                    mobile_carrier: "CLARO",
                                },
                            ],
                        },
                    },
                },
                select: {
                    name: true,
                    CellPhone: {
                        select: {
                            number: true,
                            mobile_carrier: true,
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

    it("shoud be possible to create and encrypt more than 1 field in pivot relations", async () => {
        try {
            const output = await prisma.user.create({
                data: {
                    email: "test1@test1.com",
                    name: "test1",
                    password: "test1",
                    CellPhone: {
                        create: [
                            {
                                number: "teste1",
                                mobile_carrier: "teste1",
                            },
                            {
                                number: "teste2",
                                mobile_carrier: "teste2",
                            },
                            {
                                number: "teste3",
                                mobile_carrier: "teste3",
                            },
                        ],
                    },
                },
                select: {
                    name: true,
                    CellPhone: {
                        select: {
                            number: true,
                            mobile_carrier: true,
                        },
                    },
                },
            });

            expect(output.name).toEqual("test1");
            expect(output.CellPhone[0]).toEqual({
                number: "teste1",
                mobile_carrier: "teste1",
            });
            expect(output.CellPhone[1]).toEqual({
                number: "teste2",
                mobile_carrier: "teste2",
            });
            expect(output.CellPhone[2]).toEqual({
                number: "teste3",
                mobile_carrier: "teste3",
            });

            console.log("output:", output);
        } catch (error) {
            console.log("error:", error);
            chai.assert.fail(convertToJson(error));
        }
    });

    it("shoud be possible to deeply decrypt more than 1 field in pivot relations", async () => {
        try {
            await prisma.cellPhoneCalls.create({
                data: {
                    CellPhone: {
                        create: {
                            number: "99999999999",
                            mobile_carrier: "TIM",
                            User: {
                                connect: {
                                    id: "4b9d5403-c234-4b16-97a1-0e04e446b016",
                                },
                            },
                        },
                    },
                    Call: {
                        create: {
                            CallsHistory: {
                                create: {
                                    id: "3cdefa24-20bc-4003-9909-2e16c6466d70",
                                    user_name: "test",
                                    description: "test",
                                },
                            },
                        },
                    },
                },
            });

            const output = await prisma.callsHistory.findMany({
                select: {
                    Call: {
                        select: {
                            CellPhoneCalls: {
                                select: {
                                    CellPhone: {
                                        select: {
                                            number: true,
                                            mobile_carrier: true,
                                            User: {
                                                select: {
                                                    name: true,
                                                    email: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            expect(
                output[0].Call[0].CellPhoneCalls[0].CellPhone.number,
            ).toEqual("99999999999");
            expect(
                output[0].Call[0].CellPhoneCalls[0].CellPhone.mobile_carrier,
            ).toEqual("TIM");
            expect(
                output[0].Call[0].CellPhoneCalls[0].CellPhone.User?.name,
            ).toEqual("test");
            expect(
                output[0].Call[0].CellPhoneCalls[0].CellPhone.User?.email,
            ).toEqual("test@test.com");
        } catch (error) {
            console.log("error:", error);
            chai.assert.fail(convertToJson(error));
        }
    });

    it("shoud be possible find using AND clause", async () => {
        try {
            const output = await prisma.callsHistory.findMany({
                where: {
                    AND: [
                        {
                            user_name: "test",
                        },
                        {
                            description: "test",
                        },
                    ],
                },
                select: {
                    Call: {
                        select: {
                            CellPhoneCalls: {
                                select: {
                                    CellPhone: {
                                        select: {
                                            number: true,
                                            mobile_carrier: true,
                                            User: {
                                                select: {
                                                    name: true,
                                                    email: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            console.log("output:", convertToJson(output));
            expect(
                output[0].Call[0].CellPhoneCalls[0].CellPhone.number,
            ).toEqual("99999999999");
            expect(
                output[0].Call[0].CellPhoneCalls[0].CellPhone.mobile_carrier,
            ).toEqual("TIM");
            expect(
                output[0].Call[0].CellPhoneCalls[0].CellPhone.User?.name,
            ).toEqual("test");
            expect(
                output[0].Call[0].CellPhoneCalls[0].CellPhone.User?.email,
            ).toEqual("test@test.com");
        } catch (error) {
            chai.assert.fail(convertToJson(error));
        }
    });

    it("shoud be possible find using OR clause", async () => {
        try {
            const output = await prisma.callsHistory.findMany({
                where: {
                    OR: [
                        {
                            user_name: "test",
                        },
                        {
                            description: "test",
                        },
                    ],
                },
                select: {
                    user_name: true,
                    description: true,
                    Call: {
                        select: {
                            CellPhoneCalls: {
                                select: {
                                    CellPhone: {
                                        select: {
                                            number: true,
                                            mobile_carrier: true,
                                            User: {
                                                select: {
                                                    name: true,
                                                    email: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            expect(
                output[0].Call[0].CellPhoneCalls[0].CellPhone.number,
            ).toEqual("99999999999");
            expect(
                output[0].Call[0].CellPhoneCalls[0].CellPhone.mobile_carrier,
            ).toEqual("TIM");
            expect(
                output[0].Call[0].CellPhoneCalls[0].CellPhone.User?.name,
            ).toEqual("test");
            expect(
                output[0].Call[0].CellPhoneCalls[0].CellPhone.User?.email,
            ).toEqual("test@test.com");
        } catch (error) {
            console.log("error:", error);
            chai.assert.fail(convertToJson(error));
        }
    });
});
