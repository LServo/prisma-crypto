"use strict";
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
exports.PrismaCrypto = void 0;
var client_1 = require("@prisma/client");
var sdk_1 = require("@prisma/sdk");
var encrypted_models_1 = require("./encrypted-models");
var encryption_methods_1 = require("./encryption-methods");
var PrismaCrypto = /** @class */ (function () {
    function PrismaCrypto(_a) {
        var _b = _a === void 0 ? {} : _a, debug = _b.debug, direct = _b.direct, read = _b.read, write = _b.write;
        this.debugMode = false;
        if (debug) {
            sdk_1.logger.info("[PrismaCrypto] debug mode is active");
            this.debugMode = debug;
        }
        this.direct = direct
            ? direct
            : this.getMyVar("PRISMA_CRYPTO_DIRECT_DB");
        this.write = write ? write : this.getMyVar("PRISMA_CRYPTO_WRITE_DB");
        this.read = read ? read : this.getMyVar("PRISMA_CRYPTO_READ_DB");
        this.initPrisma();
    }
    PrismaCrypto.prototype.getMyVar = function (env_var) {
        return process.env[env_var];
    };
    PrismaCrypto.convertToJson = function (variable) {
        return JSON.stringify(variable, null, 2);
    };
    PrismaCrypto.prototype.initPrisma = function () {
        var _this = this;
        var prismaOptions = {
            datasources: {
                db: {
                    url: this.direct,
                },
            },
            log: [
                {
                    emit: "event",
                    level: "query",
                },
            ],
        };
        if (!this.debugMode)
            delete prismaOptions.log;
        var prisma = new client_1.PrismaClient(prismaOptions).$extends({
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
                                if (_this.debugMode)
                                    sdk_1.logger.info("[PrismaClient] write instance");
                                return writeReplicaPrisma[model][operation](args, model, query, operation);
                            case "count":
                            case "groupBy":
                            case "aggregate":
                            case "findFirst":
                            case "findFirstOrThrow":
                            case "findMany":
                            case "findUnique":
                            case "findUniqueOrThrow":
                                if (_this.debugMode)
                                    sdk_1.logger.info("[PrismaClient] read instance");
                                return readReplicaPrisma[model][operation](args, model, query, operation);
                            default:
                                if (_this.debugMode)
                                    sdk_1.logger.info("[PrismaClient] no instance selected");
                                return;
                        }
                    },
                },
            },
        });
        var writeReplicaOptions = {
            datasources: {
                db: {
                    url: this.write,
                },
            },
        };
        var writeReplicaPrisma = new client_1.PrismaClient(writeReplicaOptions).$extends({
            name: "writeReplica",
            query: {
                $allModels: {
                    // Métodos de escrita personalizados
                    create: function (_a) {
                        var args = _a.args, model = _a.model, query = _a.query;
                        return __awaiter(_this, void 0, void 0, function () {
                            var dataToEncrypt, fieldsToManage, result;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".create", "] args before:"), PrismaCrypto.convertToJson(args));
                                        dataToEncrypt = args.data;
                                        fieldsToManage = encrypted_models_1.prismaEncryptModels[model];
                                        if (this.debugMode)
                                            sdk_1.logger.info("fieldsToManage:", PrismaCrypto.convertToJson(fieldsToManage));
                                        if (fieldsToManage)
                                            encryption_methods_1.EncryptionMethods.manageEncryption({
                                                fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                dataToEncrypt: dataToEncrypt,
                                                manageMode: "encrypt",
                                            });
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".create", "] args after:"), PrismaCrypto.convertToJson(args));
                                        return [4 /*yield*/, query(args)];
                                    case 1:
                                        result = _b.sent();
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".update", "] result before:"), PrismaCrypto.convertToJson(result));
                                        // descriptografar os campos criptografados no resultado da pesquisa
                                        if (fieldsToManage && result) {
                                            if (Array.isArray(result))
                                                // caso seja utilizado o findMany
                                                result.forEach(function (entry) {
                                                    encryption_methods_1.EncryptionMethods.manageEncryption({
                                                        fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                        dataToEncrypt: entry,
                                                        manageMode: "decrypt",
                                                    });
                                                });
                                            else
                                                encryption_methods_1.EncryptionMethods.manageEncryption({
                                                    fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                    dataToEncrypt: result,
                                                    manageMode: "decrypt",
                                                });
                                        }
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".update", "] result after:"), PrismaCrypto.convertToJson(result));
                                        return [2 /*return*/, result];
                                }
                            });
                        });
                    },
                    update: function (_a) {
                        var args = _a.args, model = _a.model, query = _a.query;
                        return __awaiter(_this, void 0, void 0, function () {
                            var dataToEncrypt, fieldsToManage, result;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".update", "] args before:"), PrismaCrypto.convertToJson(args));
                                        dataToEncrypt = args.data;
                                        fieldsToManage = encrypted_models_1.prismaEncryptModels[model];
                                        if (fieldsToManage) {
                                            encryption_methods_1.EncryptionMethods.resolveEncryptedArgs({
                                                whereArgs: args,
                                                fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                            });
                                            encryption_methods_1.EncryptionMethods.manageEncryption({
                                                fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                dataToEncrypt: dataToEncrypt,
                                                manageMode: "encrypt",
                                            });
                                        }
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".update", "] args after:"), PrismaCrypto.convertToJson(args));
                                        return [4 /*yield*/, query(args)];
                                    case 1:
                                        result = _b.sent();
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".update", "] result before:"), PrismaCrypto.convertToJson(result));
                                        // descriptografar os campos criptografados no resultado da pesquisa
                                        if (fieldsToManage && result) {
                                            if (Array.isArray(result))
                                                // caso seja utilizado o findMany
                                                result.forEach(function (entry) {
                                                    encryption_methods_1.EncryptionMethods.manageEncryption({
                                                        fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                        dataToEncrypt: entry,
                                                        manageMode: "decrypt",
                                                    });
                                                });
                                            else
                                                encryption_methods_1.EncryptionMethods.manageEncryption({
                                                    fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                    dataToEncrypt: result,
                                                    manageMode: "decrypt",
                                                });
                                        }
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".update", "] result after:"), PrismaCrypto.convertToJson(result));
                                        return [2 /*return*/, result];
                                }
                            });
                        });
                    },
                    createMany: function (_a) {
                        var args = _a.args, model = _a.model, query = _a.query;
                        return __awaiter(_this, void 0, void 0, function () {
                            var dataToEncrypt, fieldsToManage, result;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".createMany", "] args before:"), PrismaCrypto.convertToJson(args));
                                        dataToEncrypt = args.data;
                                        fieldsToManage = encrypted_models_1.prismaEncryptModels[model];
                                        if (fieldsToManage) {
                                            if (Array.isArray(dataToEncrypt))
                                                dataToEncrypt.forEach(function (entry) {
                                                    encryption_methods_1.EncryptionMethods.manageEncryption({
                                                        fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                        dataToEncrypt: entry,
                                                        manageMode: "encrypt",
                                                    });
                                                });
                                            else
                                                encryption_methods_1.EncryptionMethods.manageEncryption({
                                                    fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                    dataToEncrypt: dataToEncrypt,
                                                    manageMode: "encrypt",
                                                });
                                        }
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".createMany", "] args after:"), PrismaCrypto.convertToJson(args));
                                        return [4 /*yield*/, query(args)];
                                    case 1:
                                        result = _b.sent();
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".createMany", "] result before:"), PrismaCrypto.convertToJson(result));
                                        // descriptografar os campos criptografados no resultado da pesquisa
                                        if (fieldsToManage && result) {
                                            if (Array.isArray(result))
                                                // caso seja utilizado o findMany
                                                result.forEach(function (entry) {
                                                    encryption_methods_1.EncryptionMethods.manageEncryption({
                                                        fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                        dataToEncrypt: entry,
                                                        manageMode: "decrypt",
                                                    });
                                                });
                                            else
                                                encryption_methods_1.EncryptionMethods.manageEncryption({
                                                    fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                    dataToEncrypt: result,
                                                    manageMode: "decrypt",
                                                });
                                        }
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".createMany", "] result after:"), PrismaCrypto.convertToJson(result));
                                        return [2 /*return*/, result];
                                }
                            });
                        });
                    },
                    updateMany: function (_a) {
                        var args = _a.args, model = _a.model, query = _a.query;
                        return __awaiter(_this, void 0, void 0, function () {
                            var dataToEncrypt, whereArgs, fieldsToManage, result;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".updateMany", "] args before:"), PrismaCrypto.convertToJson(args));
                                        dataToEncrypt = args.data, whereArgs = args.where;
                                        fieldsToManage = encrypted_models_1.prismaEncryptModels[model];
                                        if (fieldsToManage) {
                                            encryption_methods_1.EncryptionMethods.resolveEncryptedArgs({
                                                whereArgs: whereArgs,
                                                fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                            });
                                            if (Array.isArray(dataToEncrypt))
                                                dataToEncrypt.forEach(function (entry) {
                                                    encryption_methods_1.EncryptionMethods.manageEncryption({
                                                        fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                        dataToEncrypt: entry,
                                                        manageMode: "encrypt",
                                                    });
                                                });
                                            else
                                                encryption_methods_1.EncryptionMethods.manageEncryption({
                                                    fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                    dataToEncrypt: dataToEncrypt,
                                                    manageMode: "encrypt",
                                                });
                                        }
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".updateMany", "] args after:"), PrismaCrypto.convertToJson(args));
                                        return [4 /*yield*/, query(args)];
                                    case 1:
                                        result = _b.sent();
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".updateMany", "] result before:"), PrismaCrypto.convertToJson(result));
                                        // descriptografar os campos criptografados no resultado da pesquisa
                                        if (fieldsToManage && result) {
                                            if (Array.isArray(result))
                                                // caso seja utilizado o findMany
                                                result.forEach(function (entry) {
                                                    encryption_methods_1.EncryptionMethods.manageEncryption({
                                                        fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                        dataToEncrypt: entry,
                                                        manageMode: "decrypt",
                                                    });
                                                });
                                            else
                                                encryption_methods_1.EncryptionMethods.manageEncryption({
                                                    fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                    dataToEncrypt: result,
                                                    manageMode: "decrypt",
                                                });
                                        }
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".updateMany", "] result after:"), PrismaCrypto.convertToJson(result));
                                        return [2 /*return*/, result];
                                }
                            });
                        });
                    },
                    upsert: function (_a) {
                        var args = _a.args, model = _a.model, query = _a.query;
                        return __awaiter(_this, void 0, void 0, function () {
                            var create, update, whereArgs, fieldsToManage, result;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".upsert", "] args before:"), PrismaCrypto.convertToJson(args));
                                        create = args.create, update = args.update, whereArgs = args.where;
                                        fieldsToManage = encrypted_models_1.prismaEncryptModels[model];
                                        if (fieldsToManage) {
                                            encryption_methods_1.EncryptionMethods.resolveEncryptedArgs({
                                                whereArgs: whereArgs,
                                                fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                            });
                                            if (create)
                                                encryption_methods_1.EncryptionMethods.manageEncryption({
                                                    fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                    dataToEncrypt: create,
                                                    manageMode: "encrypt",
                                                });
                                            if (update)
                                                encryption_methods_1.EncryptionMethods.manageEncryption({
                                                    fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                    dataToEncrypt: update,
                                                    manageMode: "encrypt",
                                                });
                                        }
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".upsert", "] args after:"), PrismaCrypto.convertToJson(args));
                                        return [4 /*yield*/, query(args)];
                                    case 1:
                                        result = _b.sent();
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".upsert", "] result before:"), PrismaCrypto.convertToJson(result));
                                        // descriptografar os campos criptografados no resultado da pesquisa
                                        if (fieldsToManage && result) {
                                            if (Array.isArray(result))
                                                // caso seja utilizado o findMany
                                                result.forEach(function (entry) {
                                                    encryption_methods_1.EncryptionMethods.manageEncryption({
                                                        fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                        dataToEncrypt: entry,
                                                        manageMode: "decrypt",
                                                    });
                                                });
                                            else
                                                encryption_methods_1.EncryptionMethods.manageEncryption({
                                                    fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                    dataToEncrypt: result,
                                                    manageMode: "decrypt",
                                                });
                                        }
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + ".upsert", "] result after:"), PrismaCrypto.convertToJson(result));
                                        return [2 /*return*/, result];
                                }
                            });
                        });
                    },
                },
            },
        });
        var readReplicaOptions = {
            datasources: {
                db: {
                    url: this.read,
                },
            },
        };
        var readReplicaPrisma = new client_1.PrismaClient(readReplicaOptions).$extends({
            name: "readReplica",
            query: {
                $allModels: {
                    $allOperations: function (_a) {
                        var args = _a.args, model = _a.model, query = _a.query, operation = _a.operation;
                        return __awaiter(_this, void 0, void 0, function () {
                            var _b, whereArgs, orderBy, fieldsToManage, fieldsNameToManage_1, result;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _b = args, whereArgs = _b.where, orderBy = _b.orderBy;
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + "." + operation, "] whereArgs before:"), whereArgs);
                                        fieldsToManage = encrypted_models_1.prismaEncryptModels[model];
                                        if (whereArgs && fieldsToManage)
                                            encryption_methods_1.EncryptionMethods.resolveEncryptedArgs({
                                                whereArgs: whereArgs,
                                                fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                            });
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + "." + operation, "] whereArgs after:"), whereArgs);
                                        if (orderBy && fieldsToManage) {
                                            fieldsNameToManage_1 = fieldsToManage.map(function (field) { return field.fieldName; });
                                            Object.keys(orderBy).forEach(function (field) {
                                                var isCryproOrderBy = fieldsNameToManage_1.includes(field);
                                                if (isCryproOrderBy) {
                                                    sdk_1.logger.error("The field ".concat(field, " is encrypted, so it cannot be used in the orderBy clause."));
                                                    process.exit(1);
                                                }
                                            });
                                        }
                                        return [4 /*yield*/, query(args)];
                                    case 1:
                                        result = _c.sent();
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + "." + operation, "] result before:"), PrismaCrypto.convertToJson(result));
                                        // descriptografar os campos criptografados no resultado da pesquisa
                                        if (fieldsToManage && result) {
                                            if (Array.isArray(result))
                                                // caso seja utilizado o findMany
                                                result.forEach(function (entry) {
                                                    encryption_methods_1.EncryptionMethods.manageEncryption({
                                                        fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                        dataToEncrypt: entry,
                                                        manageMode: "decrypt",
                                                    });
                                                });
                                            else
                                                encryption_methods_1.EncryptionMethods.manageEncryption({
                                                    fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                                    dataToEncrypt: result,
                                                    manageMode: "decrypt",
                                                });
                                        }
                                        if (this.debugMode)
                                            sdk_1.logger.info("[".concat(model + "." + operation, "] result after:"), PrismaCrypto.convertToJson(result));
                                        return [2 /*return*/, result];
                                }
                            });
                        });
                    },
                },
            },
        });
        this.prisma = prisma;
    };
    PrismaCrypto.prototype.getPrismaClient = function () {
        return this.prisma;
    };
    return PrismaCrypto;
}());
exports.PrismaCrypto = PrismaCrypto;
