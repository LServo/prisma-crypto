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
var encryption_methods_1 = require("./encryption-methods");
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
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, void 0, function () {
            var newEncryptedModels, executionUrl, result, modelExists, schemaPath, modelMigrateEncryption, latestMigration, error_1, newToken, lastEncryptedModels_1, _h, add_encryption, remove_encryption, hasChanges, newMigration, error_2, encryptedModelsFilePath, newEncryptedModelsJSON, readEncryptedModelsFile, parseToString, addModels;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        newEncryptedModels = findEncryptFields(options.schemaPath);
                        executionUrl = process.env[(_b = (_a = options.generator) === null || _a === void 0 ? void 0 : _a.config) === null || _b === void 0 ? void 0 : _b.var_env_url];
                        process.env.PRISMA_CRYPTO = executionUrl || process.env.PRISMA_WRITE;
                        if (!node_fs_1.default.existsSync((0, node_path_1.resolve)(__dirname)))
                            return [2 /*return*/, { exitCode: 1 }];
                        return [4 /*yield*/, prisma_client_1.prisma.$queryRaw(client_1.Prisma.sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT EXISTS (\n                SELECT FROM information_schema.tables\n                WHERE table_name = '_migrate_encryption'\n                ) AS \"exists\""], ["SELECT EXISTS (\n                SELECT FROM information_schema.tables\n                WHERE table_name = '_migrate_encryption'\n                ) AS \"exists\""]))))];
                    case 1:
                        result = _j.sent();
                        modelExists = (_c = result[0]) === null || _c === void 0 ? void 0 : _c.exists;
                        if (modelExists) {
                            sdk_1.logger.info("The table `_migrate_encryption` already exists in the database.");
                        }
                        else {
                            sdk_1.logger.info("The table `_migrate_encryption` does not yet exist in the database.");
                            schemaPath = (0, node_path_1.resolve)(__dirname, "..", "prisma", "schema.prisma");
                            sdk_1.logger.info("Schema Path:", schemaPath);
                            try {
                                sdk_1.logger.info("Synchronizing database schema...");
                                (0, node_child_process_1.execSync)("npx prisma db pull --schema=".concat(schemaPath));
                                modelMigrateEncryption = "\nmodel migrate_encryption {\n                    id Int @id @default(autoincrement())\n                \n                    token             String\n                    add_encryption    String[]\n                    remove_encryption String[]\n                \n                    created_at DateTime @default(now())\n                \n                    @@map(\"_migrate_encryption\")\n                }";
                                node_fs_1.default.appendFileSync(schemaPath, modelMigrateEncryption, "utf-8");
                                (0, node_child_process_1.execSync)("npx prisma db push --skip-generate --schema=".concat(schemaPath));
                                sdk_1.logger.info("Synchronization completed successfully.");
                            }
                            catch (error) {
                                sdk_1.logger.error("Error when executing `prisma db push/pull` command:", error);
                                sdk_1.logger.info("This command uses the `PRISMA_WRITE` environment variable if there is no `var_env_url` property in the generator of schema.prisma");
                                process.exit(1);
                            }
                        }
                        _j.label = 2;
                    case 2:
                        _j.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, prisma_client_1.prisma.$queryRaw(client_1.Prisma.sql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["SELECT * FROM \"_migrate_encryption\" ORDER BY \"created_at\" DESC LIMIT 1;"], ["SELECT * FROM \"_migrate_encryption\" ORDER BY \"created_at\" DESC LIMIT 1;"]))))];
                    case 3:
                        latestMigration = _j.sent();
                        sdk_1.logger.info("Most recent record:", (_d = latestMigration[0]) === null || _d === void 0 ? void 0 : _d.created_at);
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _j.sent();
                        sdk_1.logger.error("Error fetching the most recent record:", error_1);
                        process.exit(1);
                        return [3 /*break*/, 5];
                    case 5:
                        _j.trys.push([5, 9, , 10]);
                        newToken = (0, jsonwebtoken_1.sign)(newEncryptedModels, "prisma-crypto-secret");
                        if (latestMigration[0]) {
                            lastEncryptedModels_1 = (0, jsonwebtoken_1.verify)((_e = latestMigration[0]) === null || _e === void 0 ? void 0 : _e.token, "prisma-crypto-secret");
                        }
                        _h = Object.keys(newEncryptedModels).reduce(function (acc, curr) {
                            var _a, _b;
                            var _c, _d;
                            var newFields = (_c = newEncryptedModels[curr]) === null || _c === void 0 ? void 0 : _c.map(function (field) { return "".concat(curr, ".").concat(field.fieldName); });
                            var lastFields = ((_d = lastEncryptedModels_1 === null || lastEncryptedModels_1 === void 0 ? void 0 : lastEncryptedModels_1[curr]) === null || _d === void 0 ? void 0 : _d.map(function (field) { return "".concat(curr, ".").concat(field.fieldName); })) || [];
                            var fieldsToAdd = newFields.filter(function (field) { return !lastFields.includes(field); });
                            (_a = acc.add_encryption).push.apply(_a, fieldsToAdd);
                            var fieldsToRemove = lastFields.filter(function (field) { return !newFields.includes(field); });
                            (_b = acc.remove_encryption).push.apply(_b, fieldsToRemove);
                            return acc;
                        }, {
                            add_encryption: [],
                            remove_encryption: [],
                        }), add_encryption = _h.add_encryption, remove_encryption = _h.remove_encryption;
                        hasChanges = add_encryption.length || remove_encryption.length;
                        if (!hasChanges) return [3 /*break*/, 8];
                        sdk_1.logger.info("Changes found!");
                        sdk_1.logger.info("Managing encryption...");
                        // criar função para aplicar ou remover a criptografia com base add_encryption e remove_encryption
                        return [4 /*yield*/, encryption_methods_1.EncryptionMethods.managingDatabaseEncryption(add_encryption, "add")];
                    case 6:
                        // criar função para aplicar ou remover a criptografia com base add_encryption e remove_encryption
                        _j.sent();
                        sdk_1.logger.info("Saving current state...");
                        return [4 /*yield*/, prisma_client_1.prisma.$queryRaw(client_1.Prisma.sql(templateObject_3 || (templateObject_3 = __makeTemplateObject(["INSERT INTO \"_migrate_encryption\" (\"token\", \"add_encryption\", \"remove_encryption\") VALUES (", ", ", ", ", ") RETURNING *;"], ["INSERT INTO \"_migrate_encryption\" (\"token\", \"add_encryption\", \"remove_encryption\") VALUES (", ", ", ", ", ") RETURNING *;"])), newToken, add_encryption, remove_encryption))];
                    case 7:
                        newMigration = _j.sent();
                        sdk_1.logger.info("newMigration:", newMigration[0]); //remover
                        sdk_1.logger.info("Added Encryption:", (_f = newMigration[0]) === null || _f === void 0 ? void 0 : _f.add_encryption);
                        sdk_1.logger.info("Removed Encryption:", (_g = newMigration[0]) === null || _g === void 0 ? void 0 : _g.remove_encryption);
                        _j.label = 8;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        error_2 = _j.sent();
                        sdk_1.logger.error("Erro ao verificar o token:", error_2);
                        process.exit(1);
                        return [3 /*break*/, 10];
                    case 10:
                        encryptedModelsFilePath = (0, node_path_1.resolve)(__dirname, "encrypted-models.js");
                        newEncryptedModelsJSON = JSON.stringify(newEncryptedModels, null, 4);
                        readEncryptedModelsFile = node_fs_1.default.readFileSync(encryptedModelsFilePath, "utf8");
                        parseToString = "".concat(readEncryptedModelsFile);
                        addModels = parseToString.replace(/exports.prismaEncryptModels = {}/g, "exports.prismaEncryptModels = ".concat(newEncryptedModelsJSON));
                        node_fs_1.default.writeFileSync(encryptedModelsFilePath, addModels, "utf-8");
                        sdk_1.logger.info("Encrypted fields: ".concat(encryptedModelsFilePath));
                        return [2 /*return*/, {
                                exitCode: 0,
                            }];
                }
            });
        });
    },
});
var templateObject_1, templateObject_2, templateObject_3;
