#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

import { execSync } from "node:child_process";
import fs from "node:fs";
import { resolve } from "node:path";

import { Prisma } from "@prisma/client";
import { generatorHandler, GeneratorOptions } from "@prisma/generator-helper";
import { logger } from "@prisma/sdk";

import { prisma } from "./prisma-client";
export { prisma } from "./prisma-client";

interface EncryptedFields {
    [modelName: string]: {
        fieldName: string;
        typeName: string;
    }[];
}

function findEncryptFields(filePath: string): EncryptedFields {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const lines = fileContent.split("\n");

    const commentRegex = /\/\/.*?@encrypt\b/;
    const modelRegex = /^\s*model\s+(\w+)/;

    const modelsEncryptedFields = {} satisfies EncryptedFields;

    let currentModel: string = null;

    lines.forEach((line) => {
        const modelMatch = line.match(modelRegex);
        if (modelMatch) [, currentModel] = modelMatch;

        const commentMatch = line.match(commentRegex);
        if (commentMatch && currentModel) {
            const [fieldName, typeName] = line.split(/\s+/).filter(Boolean);

            if (!typeName.includes("String")) {
                logger.error(
                    `@encrypt is only supported for String fields. Field ${currentModel}.${fieldName} is ${typeName}.`,
                );
                process.exit(1); // Encerra o processo com um código de erro (1)
            }

            if (!modelsEncryptedFields[currentModel])
                modelsEncryptedFields[currentModel] = [];

            modelsEncryptedFields[currentModel].push({ fieldName, typeName });
        }
    });

    return modelsEncryptedFields;
}

generatorHandler({
    onManifest() {
        return {
            version: "1.0.0",
            // defaultOutput: "node_modules/@prisma-client",
            defaultOutput: "./",
            prettyName: "Prisma Crypto",
        };
    },
    async onGenerate(options: GeneratorOptions) {
        const encryptedFields = findEncryptFields(options.schemaPath);

        const encryptedFieldsJSON = JSON.stringify(encryptedFields, null, 4);

        const fileContent = `"use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.prismaEncryptFields = void 0;
        exports.prismaEncryptFields = ${encryptedFieldsJSON};\n`;

        console.log(
            "fs.existsSync(resolve(__dirname)):",
            fs.existsSync(resolve(__dirname)),
        );
        if (!fs.existsSync(resolve(__dirname))) return { exitCode: 1 };

        try {
            execSync("npx prisma db push");
            logger.info("Comando prisma db push executado com sucesso.");
        } catch (error) {
            logger.error("Erro ao executar o comando prisma db push:", error);
            process.exit(1);
        }

        try {
            const latestMigration = await prisma.$queryRaw(
                Prisma.sql`SELECT * FROM "migrate_encryption" ORDER BY "created_at" DESC LIMIT 1;`,
            );

            logger.info("Registro mais recente:", latestMigration);
        } catch (error) {
            logger.error("Erro ao buscar o registro mais recente:", error);
            process.exit(1);
        }

        const outputFilePath = resolve(__dirname, "encrypted-fields.js");

        fs.writeFileSync(outputFilePath, fileContent, "utf-8");

        logger.info(`Encrypted fields: ${outputFilePath}`);
        return {
            exitCode: 0,
        };
    },
});
