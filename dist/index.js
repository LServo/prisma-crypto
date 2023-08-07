#!/usr/bin/env node
"use strict";
/* eslint-disable @typescript-eslint/no-var-requires */
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
var jsonwebtoken_1 = require("jsonwebtoken");
var node_child_process_1 = require("node:child_process");
var node_fs_1 = __importDefault(require("node:fs"));
var node_path_1 = require("node:path");
var client_1 = require("@prisma/client");
var generator_helper_1 = require("@prisma/generator-helper");
var sdk_1 = require("@prisma/sdk");
var prisma_client_1 = require("./prisma-client");
var prisma_client_2 = require("./prisma-client");
Object.defineProperty(exports, "prisma", { enumerable: true, get: function () { return prisma_client_2.prisma; } });
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
            version: "1.0.0",
            // defaultOutput: "node_modules/@prisma-client",
            defaultOutput: "./",
            prettyName: "Prisma Crypto",
        };
    },
    onGenerate: function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var encryptedFields, encryptedFieldsJSON, fileContent, newToken, newTokenContent, latestMigration, error_1, outputFilePath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        encryptedFields = findEncryptFields(options.schemaPath);
                        encryptedFieldsJSON = JSON.stringify(encryptedFields, null, 4);
                        fileContent = "\"use strict\";\n        Object.defineProperty(exports, \"__esModule\", { value: true });\n        exports.prismaEncryptFields = void 0;\n        exports.prismaEncryptFields = ".concat(encryptedFieldsJSON, ";\n");
                        if (!node_fs_1.default.existsSync((0, node_path_1.resolve)(__dirname)))
                            return [2 /*return*/, { exitCode: 1 }];
                        // Verificar o token e obter os dados originais
                        try {
                            newToken = (0, jsonwebtoken_1.sign)(encryptedFields, "prisma-crypto-secret");
                            sdk_1.logger.info("newToken:", newToken);
                            newTokenContent = (0, jsonwebtoken_1.verify)(newToken, "prisma-crypto-secret");
                            sdk_1.logger.info("New Token Content:", newTokenContent);
                        }
                        catch (error) {
                            sdk_1.logger.error("Erro ao verificar o token:", error);
                            process.exit(1);
                        }
                        try {
                            sdk_1.logger.info("Executando o comando prisma db push...");
                            (0, node_child_process_1.execSync)("npx prisma db push", { stdio: "inherit" });
                            sdk_1.logger.info("Comando prisma db push executado com sucesso.");
                        }
                        catch (error) {
                            sdk_1.logger.error("Erro ao executar o comando prisma db push:", error);
                            process.exit(1);
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, prisma_client_1.prisma.$queryRaw(client_1.Prisma.sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT * FROM \"migrate_encryption\" ORDER BY \"created_at\" DESC LIMIT 1;"], ["SELECT * FROM \"migrate_encryption\" ORDER BY \"created_at\" DESC LIMIT 1;"]))))];
                    case 2:
                        latestMigration = _a.sent();
                        sdk_1.logger.info("Registro mais recente:", latestMigration);
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        sdk_1.logger.error("Erro ao buscar o registro mais recente:", error_1);
                        process.exit(1);
                        return [3 /*break*/, 4];
                    case 4:
                        outputFilePath = (0, node_path_1.resolve)(__dirname, "encrypted-fields.js");
                        node_fs_1.default.writeFileSync(outputFilePath, fileContent, "utf-8");
                        sdk_1.logger.info("Encrypted fields: ".concat(outputFilePath));
                        return [2 /*return*/, {
                                exitCode: 0,
                            }];
                }
            });
        });
    },
});
var templateObject_1;
