"use strict";
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
/* eslint-disable no-case-declarations */
var node_crypto_1 = require("node:crypto");
var client_1 = require("@prisma/client");
// eslint-disable-next-line import/no-unresolved, import/extensions
var encrypted_fields_1 = require("./encrypted-fields");
// Função para gerar um hash fixo a partir dos dados (utilizando SHA-256)
function generateHash(data) {
    var hash = (0, node_crypto_1.createHash)("sha256");
    hash.update(data, "utf8");
    return hash.digest();
}
// Função para criptografar os dados e retornar uma string codificada
function encryptData(data) {
    var fixedIV = generateHash(data);
    var cipher = (0, node_crypto_1.createCipheriv)("aes-256-gcm", process.env.SECRET_KEY, fixedIV);
    var encrypted = Buffer.concat([
        cipher.update(data, "utf8"),
        cipher.final(),
    ]);
    var tag = cipher.getAuthTag();
    // Combine o IV, a tag e o texto cifrado em uma única string codificada
    var encryptedData = Buffer.concat([fixedIV, tag, encrypted]).toString("base64");
    return encryptedData;
}
// Função para descriptografar os dados a partir da string codificada
function decryptData(encryptedData) {
    var encryptedBuffer = Buffer.from(encryptedData, "base64");
    // Extraia o IV, a tag e o texto cifrado da string codificada
    var iv = encryptedBuffer.subarray(0, 32);
    var tag = encryptedBuffer.subarray(32, 48);
    var encrypted = encryptedBuffer.subarray(48);
    var decipher = (0, node_crypto_1.createDecipheriv)("aes-256-gcm", process.env.SECRET_KEY, iv);
    decipher.setAuthTag(tag);
    var decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);
    return decrypted.toString("utf8");
}
function manageEncryption(fields, data, mode) {
    fields.forEach(function (field) {
        var fieldName = field.fieldName;
        var fieldValue = data[fieldName];
        if (!fieldValue)
            return;
        // console.log(`data[${fieldName}]:`, data[fieldName]);
        var isArray = Array.isArray(fieldValue);
        var isString = typeof fieldValue === "string";
        switch (isArray) {
            case false:
                switch (isString) {
                    case false:
                        Object.keys(fieldValue).forEach(function (key) {
                            var allowedKeys = ["equals", "not"];
                            var forbiddenKeys = [
                                "contains",
                                "startsWith",
                                "endsWith",
                                "in",
                                "notIn",
                                "lt",
                                "lte",
                                "gt",
                                "gte",
                            ];
                            if (forbiddenKeys.includes(key))
                                throw new Error("The key \"".concat(key, "\" is not allowed for the field \"").concat(fieldName, "\". Encrypted fields cannot be used with the following keys: ").concat(forbiddenKeys.join(", ")));
                            if (!allowedKeys.includes(key))
                                return; // Caso não tenha nenhum valor proibido, mas também não tenha nenhum permitido, como é o caso do "mode", então, retornamos sem fazer nada
                            if (!data[fieldName][key])
                                return;
                            // eslint-disable-next-line no-param-reassign
                            data[fieldName][key] =
                                mode === "encrypt"
                                    ? encryptData(data[fieldName][key])
                                    : decryptData(data[fieldName][key]);
                        });
                        break;
                    case true:
                        // eslint-disable-next-line no-param-reassign
                        data[fieldName] =
                            mode === "encrypt"
                                ? encryptData(data[fieldName])
                                : decryptData(data[fieldName]);
                        break;
                    default:
                }
                break;
            case true:
                // eslint-disable-next-line no-param-reassign
                data[fieldName] = data[fieldName].map(function (item) {
                    return mode === "encrypt" ? encryptData(item) : decryptData(item);
                });
                break;
            default:
                break;
        }
        // console.log(`data[${fieldName}]:`, data[fieldName]);
    });
}
function resolveEncryptedArgs(args, fields) {
    // console.log("args before:", ConvertToJson(args));
    var _a;
    var where = args.where;
    var _b = (_a = where) !== null && _a !== void 0 ? _a : {}, AND = _b.AND, NOT = _b.NOT, OR = _b.OR;
    // criptografar a pesquisa para o banco de dados passando o argumento where
    var manageArrayEncryption = function (array) {
        array.forEach(function (item) {
            if (item && typeof item === "object")
                manageEncryption(fields, item, "encrypt");
        });
    };
    if (where)
        manageEncryption(fields, where, "encrypt");
    if (AND)
        manageArrayEncryption(AND);
    if (NOT)
        manageArrayEncryption(NOT);
    if (OR)
        manageArrayEncryption(OR);
    // console.log("args after:", ConvertToJson(args));
}
var prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.PRISMA_MIGRATE,
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
                        // console.log("write");
                        return writeReplicaPrisma[model][operation](args, model, query, operation);
                    case "findFirst":
                    case "findFirstOrThrow":
                    case "findMany":
                    case "findUnique":
                    case "findUniqueOrThrow":
                        // console.log("read");
                        return readReplicaPrisma[model][operation](args, model, query, operation);
                    default:
                        // console.log("default");
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
            url: process.env.PRISMA_WRITE,
        },
    },
}).$extends({
    name: "writeReplica",
    query: {
        $allModels: {
            // Métodos de escrita personalizados
            create: function (_a) {
                var args = _a.args, model = _a.model, query = _a.query;
                // console.log("args:", ConvertToJson(args));
                var data = args.data;
                var fields = encrypted_fields_1.prismaEncryptFields[model];
                if (fields)
                    manageEncryption(fields, data, "encrypt");
                return query(__assign({}, args));
            },
            update: function (_a) {
                var args = _a.args, model = _a.model, query = _a.query;
                var data = args.data;
                var fields = encrypted_fields_1.prismaEncryptFields[model];
                if (fields) {
                    resolveEncryptedArgs(args, fields);
                    manageEncryption(fields, data, "encrypt");
                }
                return query(__assign({}, args));
            },
            createMany: function (_a) {
                var args = _a.args, model = _a.model, query = _a.query;
                var data = args.data;
                var fields = encrypted_fields_1.prismaEncryptFields[model];
                if (fields) {
                    if (Array.isArray(data))
                        data.forEach(function (entry) {
                            manageEncryption(fields, entry, "encrypt");
                        });
                    else
                        manageEncryption(fields, data, "encrypt");
                }
                return query(__assign({}, args));
            },
            updateMany: function (_a) {
                var args = _a.args, model = _a.model, query = _a.query;
                var data = args.data;
                var fields = encrypted_fields_1.prismaEncryptFields[model];
                if (fields) {
                    resolveEncryptedArgs(args, fields);
                    if (Array.isArray(data))
                        data.forEach(function (entry) {
                            manageEncryption(fields, entry, "encrypt");
                        });
                    else
                        manageEncryption(fields, data, "encrypt");
                }
                return query(__assign({}, args));
            },
            upsert: function (_a) {
                var args = _a.args, model = _a.model, query = _a.query;
                var create = args.create, update = args.update;
                var fields = encrypted_fields_1.prismaEncryptFields[model];
                if (fields) {
                    resolveEncryptedArgs(args, fields);
                    if (create)
                        manageEncryption(fields, create, "encrypt");
                    if (update)
                        manageEncryption(fields, update, "encrypt");
                }
                return query(__assign({}, args));
            },
        },
    },
});
var readReplicaPrisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.PRISMA_READ,
        },
    },
}).$extends({
    name: "readReplica",
    query: {
        $allModels: {
            $allOperations: function (_a) {
                var args = _a.args, model = _a.model, query = _a.query;
                return __awaiter(this, void 0, void 0, function () {
                    var fields, result;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                fields = encrypted_fields_1.prismaEncryptFields[model];
                                // criptografar a pesquisa para o banco de dados passando
                                if (fields)
                                    resolveEncryptedArgs(args, fields);
                                return [4 /*yield*/, query(args)];
                            case 1:
                                result = _b.sent();
                                // console.log("result before:", result);
                                // descriptografar os campos criptografados no resultado da pesquisa
                                if (fields && result) {
                                    console.log("fields:", fields);
                                    if (Array.isArray(result))
                                        // caso seja utilizado o findMany
                                        result.forEach(function (entry) {
                                            manageEncryption(fields, entry, "decrypt");
                                        });
                                    else
                                        manageEncryption(fields, result, "decrypt");
                                }
                                // console.log("result after:", result);
                                return [2 /*return*/, result];
                        }
                    });
                });
            },
        },
    },
});
