#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

import fs from "node:fs";
import { resolve } from "node:path";

import { generatorHandler, GeneratorOptions } from "@prisma/generator-helper";
import { logger } from "@prisma/sdk";
export { prisma } from "./prisma-client";

function findEncryptFields(filePath: string) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const lines = fileContent.split("\n");

    const commentRegex = /\/\/.*?@encrypt\b/;
    const modelRegex = /^\s*model\s+(\w+)/;

    const modelsEncryptedFields = {};

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
            version: "0.0.1",
            // defaultOutput: "node_modules/@prisma-client",
            defaultOutput: "./",
            prettyName: "Encrypt Fields",
        };
    },
    async onGenerate(options: GeneratorOptions) {
        console.log("options.binaryPaths:", options.binaryPaths);
        console.log("options.generator:", options.generator);
        const encryptedFields = findEncryptFields(options.schemaPath);

        const encryptedFieldsJSON = JSON.stringify(encryptedFields, null, 4);

        const fileContent = `"use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.prismaEncryptFields = void 0;
        exports.prismaEncryptFields = ${encryptedFieldsJSON};\n`;

        const isPaipe = options.generator?.config?.env === "paipe";

        const outputDirectory =
            // options.generator.output.value ||
            // process.env.PRISMA_GENERATOR_OUTPUT ||
            resolve(
                "node_modules",
                `${isPaipe ? "@paipe/prisma-crypto" : "prisma-crypto"}`,
                "dist",
            );

        // Verifique se a pasta existe, senão crie-a
        if (!fs.existsSync(outputDirectory))
            fs.mkdirSync(outputDirectory, { recursive: true });

        const outputFilePath = resolve(outputDirectory, "encrypted-fields.js");

        fs.writeFileSync(outputFilePath, fileContent, "utf-8");

        logger.info(`Generated ${outputFilePath}`);
        return {
            exitCode: 0,
        };
    },
});
