#!/usr/bin/env node
"use strict";
/* eslint-disable @typescript-eslint/no-var-requires */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
var node_fs_1 = __importDefault(require("node:fs"));
var node_path_1 = require("node:path");
var generator_helper_1 = require("@prisma/generator-helper");
var sdk_1 = require("@prisma/sdk");
var package_json_1 = require("./../package.json");
var prisma_client_1 = require("./prisma-client");
Object.defineProperty(exports, "prisma", { enumerable: true, get: function () { return prisma_client_1.prisma; } });
function findEncryptFields(filePath) {
    var fileContent = node_fs_1.default.readFileSync(filePath, "utf-8");
    var lines = fileContent.split("\n");
    var commentRegex = /\/\/.*?@encrypt\b/;
    var modelRegex = /^\s*model\s+(\w+)/;
    var modelsEncryptedFields = {};
    var currentModel = null;
    lines.forEach(function (line) {
        var modelMatch = line.match(modelRegex);
        if (modelMatch)
            currentModel = modelMatch[1];
        var commentMatch = line.match(commentRegex);
        if (commentMatch && currentModel) {
            var _a = line.split(/\s+/).filter(Boolean), fieldName = _a[0], typeName = _a[1];
            if (!typeName.includes("String")) {
                sdk_1.logger.error("@encrypt is only supported for String fields. Field ".concat(currentModel, ".").concat(fieldName, " is ").concat(typeName, "."));
                process.exit(1); // Encerra o processo com um código de erro (1)
            }
            if (!modelsEncryptedFields[currentModel])
                modelsEncryptedFields[currentModel] = [];
            modelsEncryptedFields[currentModel].push({ fieldName: fieldName, typeName: typeName });
        }
    });
    return modelsEncryptedFields;
}
(0, generator_helper_1.generatorHandler)({
    onManifest: function () {
        return {
            version: "".concat(package_json_1.version),
            // defaultOutput: "node_modules/@prisma-client",
            defaultOutput: "./",
            prettyName: "Prisma Crypto",
        };
    },
    onGenerate: function (options) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var encryptedFields, encryptedFieldsJSON, fileContent, isPaipe, outputDirectory, outputFilePath;
            return __generator(this, function (_c) {
                encryptedFields = findEncryptFields(options.schemaPath);
                encryptedFieldsJSON = JSON.stringify(encryptedFields, null, 4);
                fileContent = "\"use strict\";\n        Object.defineProperty(exports, \"__esModule\", { value: true });\n        exports.prismaEncryptFields = void 0;\n        exports.prismaEncryptFields = ".concat(encryptedFieldsJSON, ";\n");
                isPaipe = ((_b = (_a = options.generator) === null || _a === void 0 ? void 0 : _a.config) === null || _b === void 0 ? void 0 : _b.env) === "paipe";
                outputDirectory = 
                // options.generator.output.value ||
                // process.env.PRISMA_GENERATOR_OUTPUT ||
                (0, node_path_1.resolve)("node_modules", "".concat(isPaipe ? "@paipe/prisma-crypto" : "prisma-crypto"), "dist");
                // Verifique se a pasta existe, senão crie-a
                if (!node_fs_1.default.existsSync(outputDirectory))
                    node_fs_1.default.mkdirSync(outputDirectory, { recursive: true });
                outputFilePath = (0, node_path_1.resolve)(outputDirectory, "encrypted-fields.js");
                node_fs_1.default.writeFileSync(outputFilePath, fileContent, "utf-8");
                sdk_1.logger.info("Generated ".concat(outputFilePath));
                return [2 /*return*/, {
                        exitCode: 0,
                    }];
            });
        });
    },
});
