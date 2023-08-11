"use strict";
/* eslint-disable no-case-declarations */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
var client_1 = require("@prisma/client");
var sdk_1 = require("@prisma/sdk");
var encrypted_models_1 = require("./encrypted-models");
var encryption_methods_1 = require("./encryption-methods");
var convertToJson = function (variable) {
    return JSON.stringify(variable, null, 2);
};
var debugMode = process.env.PRISMA_CRYPTO_DEBUG === "true";
var prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.PRISMA_CRYPTO_DIRECT_DB,
        },
    },
}).$extends({
    query: {
        $allModels: {
            // eslint-disable-next-line consistent-return
            $allOperations: function (_a) {
                var args = _a.args, model = _a.model, query = _a.query, operation = _a.operation;
                switch (operation) {
                    case "create":
                    case "createMany":
                    case "update":
                    case "updateMany":
                    case "upsert":
                    case "delete":
                    case "deleteMany":
                        if (debugMode)
                            sdk_1.logger.info("[PrismaCLient] write instance");
                        return writeReplicaPrisma[model][operation](args, model, query, operation);
                    case "findFirst":
                    case "findFirstOrThrow":
                    case "findMany":
                    case "findUnique":
                    case "findUniqueOrThrow":
                        if (debugMode)
                            sdk_1.logger.info("[PrismaCLient] read instance");
                        return readReplicaPrisma[model][operation](args, model, query, operation);
                    default:
                        if (debugMode)
                            sdk_1.logger.info("[PrismaCLient] default instance");
                        return query(args);
                }
            },
        },
    },
});
exports.prisma = prisma;
var writeReplicaPrisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.PRISMA_CRYPTO_WRITE_DB,
        },
    },
}).$extends({
    name: "writeReplica",
    query: {
        $allModels: {
            // Métodos de escrita personalizados
            create: function (_a) {
                var args = _a.args, model = _a.model, query = _a.query;
                if (debugMode)
                    sdk_1.logger.info("[".concat(model + ".create", "] args before:"), convertToJson(args));
                var dataToEncrypt = args.data;
                var fieldsToManage = encrypted_models_1.prismaEncryptModels[model];
                if (debugMode)
                    sdk_1.logger.info("fieldsToManage:", convertToJson(fieldsToManage));
                if (fieldsToManage)
                    encryption_methods_1.EncryptionMethods.manageEncryption({
                        fieldsToManage: fieldsToManage,
                        dataToEncrypt: dataToEncrypt,
                        manageMode: "encrypt",
                    });
                if (debugMode)
                    sdk_1.logger.info("[".concat(model + ".create", "] args after:"), convertToJson(args));
                return query(__assign({}, args));
            },
            update: function (_a) {
                var args = _a.args, model = _a.model, query = _a.query;
                if (debugMode)
                    sdk_1.logger.info("[".concat(model + ".update", "] args before:"), convertToJson(args));
                var dataToEncrypt = args.data;
                var fieldsToManage = encrypted_models_1.prismaEncryptModels[model];
                if (fieldsToManage) {
                    encryption_methods_1.EncryptionMethods.resolveEncryptedArgs({
                        whereArgs: args,
                        fieldsToManage: fieldsToManage,
                    });
                    encryption_methods_1.EncryptionMethods.manageEncryption({
                        fieldsToManage: fieldsToManage,
                        dataToEncrypt: dataToEncrypt,
                        manageMode: "encrypt",
                    });
                }
                if (debugMode)
                    sdk_1.logger.info("[".concat(model + ".update", "] args after:"), convertToJson(args));
                return query(__assign({}, args));
            },
            createMany: function (_a) {
                var args = _a.args, model = _a.model, query = _a.query;
                if (debugMode)
                    sdk_1.logger.info("[".concat(model + ".createMany", "] args before:"), convertToJson(args));
                var dataToEncrypt = args.data;
                var fieldsToManage = encrypted_models_1.prismaEncryptModels[model];
                if (fieldsToManage) {
                    if (Array.isArray(dataToEncrypt))
                        dataToEncrypt.forEach(function (entry) {
                            encryption_methods_1.EncryptionMethods.manageEncryption({
                                fieldsToManage: fieldsToManage,
                                dataToEncrypt: entry,
                                manageMode: "encrypt",
                            });
                        });
                    else
                        encryption_methods_1.EncryptionMethods.manageEncryption({
                            fieldsToManage: fieldsToManage,
                            dataToEncrypt: dataToEncrypt,
                            manageMode: "encrypt",
                        });
                }
                if (debugMode)
                    sdk_1.logger.info("[".concat(model + ".createMany", "] args after:"), convertToJson(args));
                return query(__assign({}, args));
            },
            updateMany: function (_a) {
                var args = _a.args, model = _a.model, query = _a.query;
                if (debugMode)
                    sdk_1.logger.info("[".concat(model + ".updateMany", "] args before:"), convertToJson(args));
                var dataToEncrypt = args.data, whereArgs = args.where;
                var fieldsToManage = encrypted_models_1.prismaEncryptModels[model];
                if (fieldsToManage) {
                    encryption_methods_1.EncryptionMethods.resolveEncryptedArgs({
                        whereArgs: whereArgs,
                        fieldsToManage: fieldsToManage,
                    });
                    if (Array.isArray(dataToEncrypt))
                        dataToEncrypt.forEach(function (entry) {
                            encryption_methods_1.EncryptionMethods.manageEncryption({
                                fieldsToManage: fieldsToManage,
                                dataToEncrypt: entry,
                                manageMode: "encrypt",
                            });
                        });
                    else
                        encryption_methods_1.EncryptionMethods.manageEncryption({
                            fieldsToManage: fieldsToManage,
                            dataToEncrypt: dataToEncrypt,
                            manageMode: "encrypt",
                        });
                }
                if (debugMode)
                    sdk_1.logger.info("[".concat(model + ".updateMany", "] args after:"), convertToJson(args));
                return query(__assign({}, args));
            },
            upsert: function (_a) {
                var args = _a.args, model = _a.model, query = _a.query;
                if (debugMode)
                    sdk_1.logger.info("[".concat(model + ".upsert", "] args before:"), convertToJson(args));
                var create = args.create, update = args.update, whereArgs = args.where;
                var fieldsToManage = encrypted_models_1.prismaEncryptModels[model];
                if (fieldsToManage) {
                    encryption_methods_1.EncryptionMethods.resolveEncryptedArgs({
                        whereArgs: whereArgs,
                        fieldsToManage: fieldsToManage,
                    });
                    if (create)
                        encryption_methods_1.EncryptionMethods.manageEncryption({
                            fieldsToManage: fieldsToManage,
                            dataToEncrypt: create,
                            manageMode: "encrypt",
                        });
                    if (update)
                        encryption_methods_1.EncryptionMethods.manageEncryption({
                            fieldsToManage: fieldsToManage,
                            dataToEncrypt: update,
                            manageMode: "encrypt",
                        });
                }
                if (debugMode)
                    sdk_1.logger.info("[".concat(model + ".upsert", "] args after:"), convertToJson(args));
                return query(__assign({}, args));
            },
        },
    },
});
var readReplicaPrisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.PRISMA_CRYPTO_READ_DB,
        },
    },
}).$extends({
    name: "readReplica",
    query: {
        $allModels: {
            $allOperations: function (_a) {
                var args = _a.args, model = _a.model, query = _a.query, operation = _a.operation;
                return __awaiter(this, void 0, void 0, function () {
                    var whereArgs, fieldsToManage, result;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                whereArgs = args.where;
                                if (debugMode)
                                    sdk_1.logger.info("[".concat(model + "." + operation, "] whereArgs before:"), whereArgs);
                                fieldsToManage = encrypted_models_1.prismaEncryptModels[model];
                                if (fieldsToManage)
                                    encryption_methods_1.EncryptionMethods.resolveEncryptedArgs({
                                        whereArgs: whereArgs,
                                        fieldsToManage: fieldsToManage,
                                    });
                                if (debugMode)
                                    sdk_1.logger.info("[".concat(model + "." + operation, "] whereArgs after:"), whereArgs);
                                return [4 /*yield*/, query(args)];
                            case 1:
                                result = _b.sent();
                                if (debugMode)
                                    sdk_1.logger.info("[".concat(model + "." + operation, "] result before:"), result);
                                // descriptografar os campos criptografados no resultado da pesquisa
                                if (fieldsToManage && result) {
                                    if (Array.isArray(result))
                                        // caso seja utilizado o findMany
                                        result.forEach(function (entry) {
                                            encryption_methods_1.EncryptionMethods.manageEncryption({
                                                fieldsToManage: fieldsToManage,
                                                dataToEncrypt: entry,
                                                manageMode: "decrypt",
                                            });
                                        });
                                    else
                                        encryption_methods_1.EncryptionMethods.manageEncryption({
                                            fieldsToManage: fieldsToManage,
                                            dataToEncrypt: result,
                                            manageMode: "decrypt",
                                        });
                                }
                                if (debugMode)
                                    sdk_1.logger.info("[".concat(model + "." + operation, "] result before:"), result);
                                return [2 /*return*/, result];
                        }
                    });
                });
            },
        },
    },
});
