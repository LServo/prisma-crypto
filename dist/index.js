#!/usr/bin/env node
"use strict";
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
exports.EncryptionMethods = exports.PrismaCrypto = void 0;
/* eslint-disable @typescript-eslint/no-var-requires */
require("dotenv/config");
var jsonwebtoken_1 = require("jsonwebtoken");
var node_child_process_1 = require("node:child_process");
var node_fs_1 = __importDefault(require("node:fs"));
var node_path_1 = require("node:path");
var uuid_1 = require("uuid");
var client_1 = require("@prisma/client");
var generator_helper_1 = require("@prisma/generator-helper");
var sdk_1 = require("@prisma/sdk");
var encryption_methods_1 = require("./encryption-methods");
var prisma_client_1 = require("./prisma-client");
var prisma_client_2 = require("./prisma-client");
Object.defineProperty(exports, "PrismaCrypto", { enumerable: true, get: function () { return prisma_client_2.PrismaCrypto; } });
var encryption_methods_2 = require("./encryption-methods");
Object.defineProperty(exports, "EncryptionMethods", { enumerable: true, get: function () { return encryption_methods_2.EncryptionMethods; } });
function findEncryptFields(filePath, modelsInfo) {
    var fileContent = node_fs_1.default.readFileSync(filePath, "utf-8");
    var lines = fileContent.split("\n");
    var commentRegex = /\/\/.*?@encrypt\b/;
    var modelRegex = /^\s*model\s+(\w+)/;
    var modelsEncryptedFields = {};
    var modelsEncryptedFieldsDbName = {};
    var currentModel = null;
    var currentModelDbName = null;
    lines.forEach(function (line) {
        var modelMatch = line.match(modelRegex);
        if (modelMatch) {
            currentModel = modelMatch[1];
            currentModelDbName = getDbName({
                modelName: currentModel,
                modelsInfo: modelsInfo,
            });
        }
        var commentMatch = line.match(commentRegex);
        if (commentMatch && currentModel) {
            var _a = line.split(/\s+/).filter(Boolean), fieldName = _a[0], typeName = _a[1];
            if (!typeName.includes("String")) {
                sdk_1.logger.error("@encrypt is only supported for String fields. Field ".concat(currentModel, ".").concat(fieldName, " is ").concat(typeName, "."));
                process.exit(1); // Encerra o processo com um código de erro (1)
            }
            if (!modelsEncryptedFields[currentModel])
                modelsEncryptedFields[currentModel] = [];
            if (!modelsEncryptedFieldsDbName[currentModelDbName])
                modelsEncryptedFieldsDbName[currentModelDbName] = [];
            modelsEncryptedFields[currentModel].push({ fieldName: fieldName, typeName: typeName });
            modelsEncryptedFieldsDbName[currentModelDbName].push({
                fieldName: fieldName,
                typeName: typeName,
            });
        }
    });
    var numberOfModels = modelsInfo.length;
    var _loop_1 = function (i) {
        var encryptedModelsRegex = Object.keys(modelsEncryptedFields).map(function (model) { return new RegExp("\\b".concat(model, "\\b")); });
        currentModel = null;
        lines.forEach(function (line) {
            var modelMatch = line.match(modelRegex);
            if (modelMatch) {
                currentModel = modelMatch[1];
                currentModelDbName = getDbName({
                    modelName: currentModel,
                    modelsInfo: modelsInfo,
                });
            }
            var commentMatch = null;
            if (!modelMatch)
                commentMatch = encryptedModelsRegex.some(function (regex) {
                    return line.match(regex);
                });
            if (commentMatch && currentModel) {
                var _a = line.split(/\s+/).filter(Boolean), fieldName_1 = _a[0], typeName_1 = _a[1];
                typeName_1 = typeName_1.replace("[]", "").replace("?", "");
                if (!modelsEncryptedFields[currentModel])
                    modelsEncryptedFields[currentModel] = [];
                if (!modelsEncryptedFieldsDbName[currentModelDbName])
                    modelsEncryptedFieldsDbName[currentModelDbName] = [];
                var fieldAlreadyExists = modelsEncryptedFields[currentModel].some(function (field) {
                    return (field.fieldName === fieldName_1 ||
                        field.fieldName === "".concat(fieldName_1, ">").concat(typeName_1));
                });
                if (fieldAlreadyExists)
                    return;
                modelsEncryptedFields[currentModel].push({
                    fieldName: "".concat(fieldName_1, ">").concat(typeName_1),
                    typeName: "Relation",
                });
                modelsEncryptedFieldsDbName[currentModelDbName].push({
                    fieldName: "".concat(fieldName_1, ">").concat(typeName_1.toLowerCase()),
                    typeName: "Relation",
                });
            }
        });
    };
    // criar um loop para rodar o número de vezes que temos de models
    for (var i = 0; i < numberOfModels; i++) {
        _loop_1(i);
    }
    return { modelsEncryptedFields: modelsEncryptedFields, modelsEncryptedFieldsDbName: modelsEncryptedFieldsDbName };
}
function getMyVar(env_var) {
    return process.env[env_var];
}
function validateEnvVars() {
    var requiredEnvVars = [
        "PRISMA_CRYPTO_SECRET_KEY",
        "PRISMA_CRYPTO_DIRECT_DB",
        "PRISMA_CRYPTO_WRITE_DB",
        "PRISMA_CRYPTO_READ_DB",
    ];
    var missingEnvVars = [];
    for (var _i = 0, requiredEnvVars_1 = requiredEnvVars; _i < requiredEnvVars_1.length; _i++) {
        var envVar = requiredEnvVars_1[_i];
        var value = getMyVar(envVar);
        if (!value)
            missingEnvVars.push(envVar);
    }
    if (missingEnvVars.length > 0) {
        sdk_1.logger.error("The following environment variables are required: ".concat(missingEnvVars.join(", "), "."));
        process.exit(1);
    }
}
// função que recebe um nome de model do schema.prisma e retorna o nome do model no banco de dados
var getDbName = function (_a) {
    var modelName = _a.modelName, modelsInfo = _a.modelsInfo;
    var findModelInfo = modelsInfo.find(function (model) { return model.name === modelName; });
    var modelDbName = (findModelInfo === null || findModelInfo === void 0 ? void 0 : findModelInfo.dbName) || modelName;
    if (!modelDbName) {
        sdk_1.logger.error("Model ".concat(modelName, " not found in the database."));
        process.exit(1);
    }
    return modelDbName;
};
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
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function () {
            var prisma, _f, newEncryptedModels, newEncryptedModelsDbName, schemaHasMigrateEncryption, modelMigrateEncryption, onlyPostgresProvider, searchForMigrateEncryption, dbHasMigrateEncryption, prismaCryptoSchemaPath, originalSchemaDirectory, temporarySchemaPath, latestMigration, error_1, newToken, lastEncryptedModels, getEncryptionChanges, _g, add_encryption, remove_encryption, _h, add_encryption_db_name, remove_encryption_db_name, hasChanges, deepClonedAddEncryption, deepClonedAddEncryptionDbName, deepClonedRemoveEncryption, deepClonedRemoveEncryptionDbName, error_2, migrationId, newMigration, error_3, encryptedModelsFilePath, newEncryptedModelsJSON, readEncryptedModelsFile, regex, findIndex, cutInterestParts, newContent;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        validateEnvVars();
                        prisma = new prisma_client_1.PrismaCrypto({}).getPrismaClient();
                        _f = findEncryptFields(options.schemaPath, options.dmmf.datamodel.models), newEncryptedModels = _f.modelsEncryptedFields, newEncryptedModelsDbName = _f.modelsEncryptedFieldsDbName;
                        schemaHasMigrateEncryption = options.dmmf.datamodel.models
                            .map(function (model) { return model.dbName; })
                            .includes("_migrate_encryption");
                        modelMigrateEncryption = "\nmodel MigrateEncryption {\n            id String @id @default(uuid())\n        \n            token             String\n            applied           Boolean  @default(true)\n            add_encryption    String[]\n            remove_encryption String[]\n        \n            created_at DateTime @default(now())\n        \n            @@map(\"_migrate_encryption\")\n        }";
                        if (!schemaHasMigrateEncryption) {
                            node_fs_1.default.appendFileSync(options.schemaPath, modelMigrateEncryption, "utf-8");
                            sdk_1.logger.info("The `_migrate_encryption` table was added to your schema.prisma.");
                        }
                        onlyPostgresProvider = options.datasources.every(function (datasource) { return datasource.provider === "postgresql"; });
                        if (!onlyPostgresProvider) {
                            sdk_1.logger.error("Prisma Crypto currently only supports PostgreSQL databases.");
                            process.exit(1);
                        }
                        if (!node_fs_1.default.existsSync((0, node_path_1.resolve)(__dirname)))
                            return [2 /*return*/, { exitCode: 1 }];
                        return [4 /*yield*/, prisma.$queryRaw(client_1.Prisma.sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT EXISTS (\n                SELECT FROM information_schema.tables\n                WHERE table_name = '_migrate_encryption'\n                ) AS \"exists\""], ["SELECT EXISTS (\n                SELECT FROM information_schema.tables\n                WHERE table_name = '_migrate_encryption'\n                ) AS \"exists\""]))))];
                    case 1:
                        searchForMigrateEncryption = _j.sent();
                        dbHasMigrateEncryption = (_a = searchForMigrateEncryption[0]) === null || _a === void 0 ? void 0 : _a.exists;
                        if (dbHasMigrateEncryption) {
                            sdk_1.logger.info("The table `_migrate_encryption` already exists in the database.");
                        }
                        else {
                            sdk_1.logger.info("The table `_migrate_encryption` does not yet exist in the database.");
                            prismaCryptoSchemaPath = (0, node_path_1.resolve)(__dirname, "..", "prisma", "crypto.schema.prisma");
                            originalSchemaDirectory = options.schemaPath
                                .split("/")
                                .slice(0, -1);
                            originalSchemaDirectory.push("crypto.schema.prisma");
                            temporarySchemaPath = originalSchemaDirectory.join("/");
                            if (node_fs_1.default.existsSync(temporarySchemaPath))
                                node_fs_1.default.unlinkSync(temporarySchemaPath);
                            node_fs_1.default.copyFileSync(prismaCryptoSchemaPath, temporarySchemaPath, node_fs_1.default.constants.COPYFILE_EXCL);
                            sdk_1.logger.info("Temporary Schema Path:", temporarySchemaPath);
                            try {
                                sdk_1.logger.info("Synchronizing database schema...");
                                (0, node_child_process_1.execSync)("npx prisma db pull --schema=".concat(temporarySchemaPath));
                                node_fs_1.default.appendFileSync(temporarySchemaPath, modelMigrateEncryption, "utf-8");
                                // execSync(
                                //     `npx prisma db push --skip-generate --schema=${schemaPath}`,
                                // );
                                (0, node_child_process_1.execSync)("npx prisma migrate dev --name prisma_crypto_migrate_encryption --skip-generate --skip-seed --schema=".concat(temporarySchemaPath));
                                if (node_fs_1.default.existsSync(temporarySchemaPath))
                                    node_fs_1.default.unlinkSync(temporarySchemaPath);
                                sdk_1.logger.info("Synchronization completed successfully.");
                            }
                            catch (error) {
                                sdk_1.logger.error("Error when executing `prisma db push/pull/migrate` command:", error);
                                process.exit(1);
                            }
                        }
                        _j.label = 2;
                    case 2:
                        _j.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, prisma.$queryRaw(client_1.Prisma.sql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["SELECT * FROM \"_migrate_encryption\" ORDER BY \"created_at\" DESC LIMIT 1;"], ["SELECT * FROM \"_migrate_encryption\" ORDER BY \"created_at\" DESC LIMIT 1;"]))))];
                    case 3:
                        latestMigration = _j.sent();
                        sdk_1.logger.info("Most recent record:", (_b = latestMigration[0]) === null || _b === void 0 ? void 0 : _b.created_at);
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _j.sent();
                        sdk_1.logger.error("Error fetching the most recent record:", error_1);
                        process.exit(1);
                        return [3 /*break*/, 5];
                    case 5:
                        _j.trys.push([5, 13, , 14]);
                        newToken = (0, jsonwebtoken_1.sign)({
                            encryptedModels: newEncryptedModels,
                            encryptedModelsDbName: newEncryptedModelsDbName,
                        }, "prisma-crypto-secret");
                        lastEncryptedModels = void 0;
                        if (latestMigration[0]) {
                            lastEncryptedModels = (0, jsonwebtoken_1.verify)((_c = latestMigration[0]) === null || _c === void 0 ? void 0 : _c.token, "prisma-crypto-secret");
                        }
                        getEncryptionChanges = function (newModels, oldModels) {
                            // verifica se algum model foi removido da lista de models para criptografar, se sim, automaticamente todos os campos dele devem entrar para a lista de remove_encryption
                            var removed_fields = (oldModels
                                ? Object.keys(oldModels).reduce(function (acc, curr) {
                                    var _a;
                                    if (newModels[curr])
                                        return acc;
                                    var modelFields = oldModels[curr].map(function (field) { return "".concat(curr, ".").concat(field.fieldName); });
                                    (_a = acc.removed_fields).push.apply(_a, modelFields);
                                    return acc;
                                }, {
                                    removed_fields: [],
                                })
                                : { removed_fields: [] }).removed_fields;
                            //transformar em array de strings
                            var _a = Object.keys(newModels).reduce(function (acc, curr) {
                                var _a, _b;
                                var _c, _d;
                                var newFields;
                                if (newModels)
                                    newFields = (_c = newModels[curr]) === null || _c === void 0 ? void 0 : _c.map(function (field) { return "".concat(curr, ".").concat(field.fieldName); });
                                var oldFields;
                                if (oldModels)
                                    oldFields =
                                        ((_d = oldModels[curr]) === null || _d === void 0 ? void 0 : _d.map(function (field) { return "".concat(curr, ".").concat(field.fieldName); })) || [];
                                var fieldsToAdd = newFields === null || newFields === void 0 ? void 0 : newFields.filter(function (field) { return !(oldFields === null || oldFields === void 0 ? void 0 : oldFields.includes(field)); });
                                (_a = acc.add_encryption).push.apply(_a, fieldsToAdd);
                                var fieldsToRemove = oldFields === null || oldFields === void 0 ? void 0 : oldFields.filter(function (field) { return !(newFields === null || newFields === void 0 ? void 0 : newFields.includes(field)); });
                                (_b = acc.remove_encryption).push.apply(_b, fieldsToRemove);
                                return acc;
                            }, {
                                add_encryption: [],
                                remove_encryption: [],
                            }), add_encryption = _a.add_encryption, remove_encryption = _a.remove_encryption;
                            remove_encryption.push.apply(remove_encryption, removed_fields);
                            return {
                                add_encryption: add_encryption,
                                remove_encryption: remove_encryption,
                            };
                        };
                        _g = getEncryptionChanges(newEncryptedModels, lastEncryptedModels === null || lastEncryptedModels === void 0 ? void 0 : lastEncryptedModels.encryptedModels), add_encryption = _g.add_encryption, remove_encryption = _g.remove_encryption;
                        _h = getEncryptionChanges(newEncryptedModelsDbName, lastEncryptedModels === null || lastEncryptedModels === void 0 ? void 0 : lastEncryptedModels.encryptedModelsDbName), add_encryption_db_name = _h.add_encryption, remove_encryption_db_name = _h.remove_encryption;
                        hasChanges = add_encryption.length || remove_encryption.length;
                        if (!hasChanges) return [3 /*break*/, 12];
                        sdk_1.logger.info("Changes found!");
                        sdk_1.logger.info("Managing encryption...");
                        _j.label = 6;
                    case 6:
                        _j.trys.push([6, 9, , 10]);
                        deepClonedAddEncryption = JSON.parse(JSON.stringify(add_encryption));
                        deepClonedAddEncryptionDbName = JSON.parse(JSON.stringify(add_encryption_db_name));
                        deepClonedRemoveEncryption = JSON.parse(JSON.stringify(remove_encryption));
                        deepClonedRemoveEncryptionDbName = JSON.parse(JSON.stringify(remove_encryption_db_name));
                        return [4 /*yield*/, encryption_methods_1.EncryptionMethods.managingDatabaseEncryption(deepClonedAddEncryption, deepClonedAddEncryptionDbName, "add")];
                    case 7:
                        _j.sent();
                        return [4 /*yield*/, encryption_methods_1.EncryptionMethods.managingDatabaseEncryption(deepClonedRemoveEncryption, deepClonedRemoveEncryptionDbName, "remove")];
                    case 8:
                        _j.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        error_2 = _j.sent();
                        sdk_1.logger.error("Error when applying encryption to the database:", error_2);
                        process.exit(1);
                        return [3 /*break*/, 10];
                    case 10:
                        sdk_1.logger.info("Saving current state...");
                        migrationId = (0, uuid_1.v4)();
                        return [4 /*yield*/, prisma.$queryRaw(client_1.Prisma.sql(templateObject_3 || (templateObject_3 = __makeTemplateObject(["INSERT INTO \"_migrate_encryption\" (\"id\", \"token\", \"add_encryption\", \"remove_encryption\") VALUES (", ", ", ", ", ", ", ") RETURNING *;"], ["INSERT INTO \"_migrate_encryption\" (\"id\", \"token\", \"add_encryption\", \"remove_encryption\") VALUES (", ", ", ", ", ", ", ") RETURNING *;"])), migrationId, newToken, add_encryption, remove_encryption))];
                    case 11:
                        newMigration = _j.sent();
                        sdk_1.logger.info("Added Encryption:", JSON.stringify((_d = newMigration[0]) === null || _d === void 0 ? void 0 : _d.add_encryption));
                        sdk_1.logger.info("Removed Encryption:", JSON.stringify((_e = newMigration[0]) === null || _e === void 0 ? void 0 : _e.remove_encryption));
                        _j.label = 12;
                    case 12: return [3 /*break*/, 14];
                    case 13:
                        error_3 = _j.sent();
                        sdk_1.logger.error("Erro ao verificar o token:", error_3);
                        process.exit(1);
                        return [3 /*break*/, 14];
                    case 14:
                        encryptedModelsFilePath = (0, node_path_1.resolve)(__dirname, "encrypted-models.js");
                        newEncryptedModelsJSON = JSON.stringify(newEncryptedModels, null, 4);
                        readEncryptedModelsFile = node_fs_1.default.readFileSync(encryptedModelsFilePath, "utf8");
                        regex = /exports\.prismaEncryptModels = \{/;
                        findIndex = readEncryptedModelsFile.search(regex);
                        if (findIndex !== -1) {
                            cutInterestParts = readEncryptedModelsFile.slice(0, findIndex);
                            newContent = cutInterestParts +
                                "exports.prismaEncryptModels = " +
                                newEncryptedModelsJSON +
                                ";";
                            node_fs_1.default.writeFileSync(encryptedModelsFilePath, newContent, "utf-8");
                        }
                        sdk_1.logger.info("Encrypted models: ".concat(encryptedModelsFilePath));
                        return [2 /*return*/, {
                                exitCode: 0,
                            }];
                }
            });
        });
    },
});
var templateObject_1, templateObject_2, templateObject_3;
