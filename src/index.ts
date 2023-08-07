#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

import { sign, verify } from "jsonwebtoken";
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
        const executionUrl =
            process.env[options.generator?.config?.var_env_url as string];
        process.env.PRISMA_CRYPTO = executionUrl || process.env.PRISMA_WRITE;

        const encryptedFieldsJSON = JSON.stringify(encryptedFields, null, 4);

        const fileContent = `"use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.prismaEncryptFields = void 0;
        exports.prismaEncryptFields = ${encryptedFieldsJSON};\n`;

        if (!fs.existsSync(resolve(__dirname))) return { exitCode: 1 };

        // Verificar o token e obter os dados originais
        try {
            const newToken = sign(encryptedFields, "prisma-crypto-secret");
            logger.info("newToken:", newToken);
            const newTokenContent = verify(newToken, "prisma-crypto-secret");
            logger.info("New Token Content:", newTokenContent);
        } catch (error) {
            logger.error("Erro ao verificar o token:", error);
            process.exit(1);
        }

        const schemaPath = resolve(__dirname, "..", "prisma", "schema.prisma");
        logger.info("Schema Path:", schemaPath);
        try {
            logger.info("Sincronizando schema do banco...");
            execSync(`npx prisma db pull --schema=${schemaPath}`, {
                stdio: "inherit",
            });

            const modelMigrateEncryption = `\nmodel migrate_encryption {
                id Int @id @default(autoincrement())
            
                token             String
                add_encryption    String[]
                remove_encryption String[]
            
                created_at DateTime @default(now())
            }`;
            fs.appendFileSync(schemaPath, modelMigrateEncryption, "utf-8");

            execSync(
                `npx prisma db push --skip-generate --schema=${schemaPath}`,
                {
                    stdio: "inherit",
                },
            );
            logger.info("Sincronização finalizada com sucesso.");
        } catch (error) {
            logger.error(
                "Erro ao executar o comando prisma db push/pull:",
                error,
            );
            logger.info(
                "Este comando utiliza a variável de ambiente PRISMA_WRITE caso não exista uma propriedade `var_env_url` no generator do schema.prisma",
            );
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
