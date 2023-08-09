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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionMethods = void 0;
var node_crypto_1 = require("node:crypto");
var client_1 = require("@prisma/client");
var prisma_client_1 = require("./prisma-client");
var EncryptionMethods = /** @class */ (function () {
    function EncryptionMethods() {
    }
    EncryptionMethods.generateHash = function (_a) {
        var stringToGenerateHash = _a.stringToGenerateHash;
        var hash = (0, node_crypto_1.createHash)("sha256");
        hash.update(stringToGenerateHash, "utf8");
        var generatedHash = hash.digest();
        return { generatedHash: generatedHash };
    };
    EncryptionMethods.prototype.generateHash = function (_a) {
        var stringToGenerateHash = _a.stringToGenerateHash;
        return EncryptionMethods.generateHash({ stringToGenerateHash: stringToGenerateHash });
    };
    EncryptionMethods.resolveEncryptedArgs = function (_a) {
        var _b;
        var whereArgs = _a.whereArgs, fieldsToManage = _a.fieldsToManage;
        // console.log("args before:", ConvertToJson(args));
        var _c = (_b = whereArgs) !== null && _b !== void 0 ? _b : {}, AND = _c.AND, NOT = _c.NOT, OR = _c.OR;
        // criptografar a pesquisa para o banco de dados passando o argumento where
        var manageArrayEncryption = function (array) {
            array.forEach(function (item) {
                if (item && typeof item === "object")
                    EncryptionMethods.manageEncryption({
                        fieldsToManage: fieldsToManage,
                        dataToEncrypt: item,
                        manageMode: "encrypt",
                    });
            });
        };
        if (whereArgs)
            EncryptionMethods.manageEncryption({
                fieldsToManage: fieldsToManage,
                dataToEncrypt: whereArgs,
                manageMode: "encrypt",
            });
        if (AND)
            manageArrayEncryption(AND);
        if (NOT)
            manageArrayEncryption(NOT);
        if (OR)
            manageArrayEncryption(OR);
        // console.log("args after:", ConvertToJson(args));
        return {};
    };
    EncryptionMethods.prototype.resolveEncryptedArgs = function (_a) {
        var whereArgs = _a.whereArgs, fieldsToManage = _a.fieldsToManage;
        return EncryptionMethods.resolveEncryptedArgs({
            whereArgs: whereArgs,
            fieldsToManage: fieldsToManage,
        });
    };
    EncryptionMethods.manageEncryption = function (_a) {
        var dataToEncrypt = _a.dataToEncrypt, fieldsToManage = _a.fieldsToManage, manageMode = _a.manageMode;
        fieldsToManage.forEach(function (field) {
            var _a, _b;
            var fieldName = field.fieldName;
            var fieldValue = dataToEncrypt[fieldName];
            if (!fieldValue)
                return;
            console.log("dataToEncrypt[".concat(fieldName, "]:"), dataToEncrypt[fieldName]);
            var isArray = Array.isArray(fieldValue);
            var isString = typeof fieldValue === "string";
            switch (isArray) {
                case false:
                    switch (isString) {
                        case false:
                            Object.keys(fieldValue).forEach(function (key) {
                                var _a, _b;
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
                                if (!dataToEncrypt[fieldName][key])
                                    return;
                                // eslint-disable-next-line no-param-reassign
                                dataToEncrypt[fieldName][key] =
                                    manageMode === "encrypt"
                                        ? (_a = EncryptionMethods.encryptData({
                                            stringToEncrypt: dataToEncrypt[fieldName][key],
                                        })) === null || _a === void 0 ? void 0 : _a.encryptedString
                                        : (_b = EncryptionMethods.decryptData({
                                            stringToDecrypt: dataToEncrypt[fieldName][key],
                                        })) === null || _b === void 0 ? void 0 : _b.decryptedString;
                            });
                            break;
                        case true:
                            // eslint-disable-next-line no-param-reassign
                            dataToEncrypt[fieldName] =
                                manageMode === "encrypt"
                                    ? (_a = EncryptionMethods.encryptData({
                                        stringToEncrypt: dataToEncrypt[fieldName],
                                    })) === null || _a === void 0 ? void 0 : _a.encryptedString
                                    : (_b = EncryptionMethods.decryptData({
                                        stringToDecrypt: dataToEncrypt[fieldName],
                                    })) === null || _b === void 0 ? void 0 : _b.decryptedString;
                            break;
                        default:
                    }
                    break;
                case true:
                    // eslint-disable-next-line no-param-reassign
                    dataToEncrypt[fieldName] = dataToEncrypt[fieldName].map(function (item) {
                        var _a, _b;
                        return manageMode === "encrypt"
                            ? (_a = EncryptionMethods.encryptData({
                                stringToEncrypt: item,
                            })) === null || _a === void 0 ? void 0 : _a.encryptedString
                            : (_b = EncryptionMethods.decryptData({
                                stringToDecrypt: item,
                            })) === null || _b === void 0 ? void 0 : _b.decryptedString;
                    });
                    break;
                default:
                    break;
            }
            console.log("dataToEncrypt[".concat(fieldName, "]:"), dataToEncrypt[fieldName]);
        });
        return {};
    };
    EncryptionMethods.prototype.manageEncryption = function (_a) {
        var manageMode = _a.manageMode, dataToEncrypt = _a.dataToEncrypt, fieldsToManage = _a.fieldsToManage;
        return EncryptionMethods.manageEncryption({
            manageMode: manageMode,
            dataToEncrypt: dataToEncrypt,
            fieldsToManage: fieldsToManage,
        });
    };
    EncryptionMethods.encryptData = function (_a) {
        var stringToEncrypt = _a.stringToEncrypt;
        console.log("encryptData");
        console.log("stringToEncrypt:", stringToEncrypt);
        var fixedIV = EncryptionMethods.generateHash({
            stringToGenerateHash: stringToEncrypt,
        }).generatedHash;
        var cipher = (0, node_crypto_1.createCipheriv)("aes-256-gcm", process.env.SECRET_KEY, fixedIV);
        var encrypted = Buffer.concat([
            cipher.update(stringToEncrypt, "utf8"),
            cipher.final(),
        ]);
        var tag = cipher.getAuthTag();
        // Combine o IV, a tag e o texto cifrado em uma única string codificada
        var encryptedString = Buffer.concat([
            fixedIV,
            tag,
            encrypted,
        ]).toString("base64");
        return { encryptedString: encryptedString };
    };
    EncryptionMethods.prototype.encryptData = function (_a) {
        var stringToEncrypt = _a.stringToEncrypt;
        return EncryptionMethods.encryptData({ stringToEncrypt: stringToEncrypt });
    };
    EncryptionMethods.decryptData = function (_a) {
        var stringToDecrypt = _a.stringToDecrypt;
        console.log("decryptData");
        console.log("stringToDecrypt:", stringToDecrypt);
        var encryptedBuffer = Buffer.from(stringToDecrypt, "base64");
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
        var decryptedString = decrypted.toString("utf8");
        return { decryptedString: decryptedString };
    };
    EncryptionMethods.prototype.decryptData = function (_a) {
        var stringToDecrypt = _a.stringToDecrypt;
        return EncryptionMethods.decryptData({ stringToDecrypt: stringToDecrypt });
    };
    EncryptionMethods.managingDatabaseEncryption = function (fields, action) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function () {
            var actualField, _d, tableName, columnName, result, columnExists, columnType, columnDataType, isArrayColumn, isTextColumn, getModelPrimaryKey, primaryKeyColumnName, allEntriesQuery, allEntries;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        console.log("action:", action);
                        console.log("index:", fields.length);
                        actualField = fields.shift();
                        if (!actualField)
                            return [2 /*return*/];
                        _d = actualField.split("."), tableName = _d[0], columnName = _d[1];
                        return [4 /*yield*/, prisma_client_1.prisma
                                .$queryRaw(client_1.Prisma.sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT EXISTS (\n                    SELECT FROM information_schema.columns\n                    WHERE table_name = ", "\n                    AND column_name = ", "\n                    ) AS \"exists\""], ["SELECT EXISTS (\n                    SELECT FROM information_schema.columns\n                    WHERE table_name = ", "\n                    AND column_name = ", "\n                    ) AS \"exists\""])), tableName, columnName))
                                .catch(function (error) {
                                throw new Error("Error when executing the query to check if the column ".concat(tableName, ".").concat(columnName, " exists: ").concat(error));
                            })];
                    case 1:
                        result = _e.sent();
                        columnExists = (_a = result[0]) === null || _a === void 0 ? void 0 : _a.exists;
                        if (!columnExists) {
                            throw new Error("The column ".concat(tableName, ".").concat(columnName, " does not exists in the database."));
                        }
                        return [4 /*yield*/, prisma_client_1.prisma
                                .$queryRaw(client_1.Prisma.sql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["SELECT data_type FROM information_schema.columns WHERE table_name = ", " AND column_name = ", ";"], ["SELECT data_type FROM information_schema.columns WHERE table_name = ", " AND column_name = ", ";"])), tableName, columnName))
                                .catch(function (error) {
                                throw new Error("Error when executing the query to get the column type of ".concat(tableName, ".").concat(columnName, ": ").concat(error));
                            })];
                    case 2:
                        columnType = _e.sent();
                        columnDataType = (_b = columnType[0]) === null || _b === void 0 ? void 0 : _b.data_type;
                        isArrayColumn = columnDataType === "ARRAY";
                        isTextColumn = columnDataType === "text";
                        if (!isTextColumn && !isArrayColumn) {
                            throw new Error("The column ".concat(tableName, ".").concat(columnName, " is not of type \"text\"."));
                        }
                        // encontre a primary key da tabela
                        console.log("Prisma.sql: getModelPrimaryKey:", "SELECT column_name FROM information_schema.key_column_usage WHERE table_name = '".concat(tableName, "' AND constraint_name = '").concat(tableName, "_pkey';"));
                        return [4 /*yield*/, prisma_client_1.prisma
                                .$queryRaw(client_1.Prisma.sql(templateObject_3 || (templateObject_3 = __makeTemplateObject(["SELECT column_name FROM information_schema.key_column_usage WHERE table_name = ", " AND constraint_name = ", ";"], ["SELECT column_name FROM information_schema.key_column_usage WHERE table_name = ", " AND constraint_name = ", ";"])), tableName, tableName + "_pkey"))
                                .catch(function (error) {
                                throw new Error("Error when executing the query to get the primary key of ".concat(tableName, ": ").concat(error));
                            })];
                    case 3:
                        getModelPrimaryKey = _e.sent();
                        console.log("getModelPrimaryKey:", getModelPrimaryKey);
                        primaryKeyColumnName = (_c = getModelPrimaryKey[0]) === null || _c === void 0 ? void 0 : _c.column_name;
                        console.log("primaryKeyColumnName:", primaryKeyColumnName);
                        allEntriesQuery = "SELECT " +
                            primaryKeyColumnName +
                            ", " +
                            columnName +
                            " FROM " +
                            tableName;
                        console.log("allEntriesQuery:", allEntriesQuery);
                        return [4 /*yield*/, prisma_client_1.prisma
                                .$queryRaw(client_1.Prisma.sql(templateObject_4 || (templateObject_4 = __makeTemplateObject(["", ""], ["", ""])), allEntriesQuery))
                                .catch(function (error) {
                                throw new Error("Error when executing the query to get all entries of ".concat(tableName, ": ").concat(error));
                            })];
                    case 4:
                        allEntries = _e.sent();
                        console.log("allEntries:", allEntries);
                        if (!(fields.length > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.managingDatabaseEncryption(fields, "add")];
                    case 5:
                        _e.sent();
                        _e.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return EncryptionMethods;
}());
exports.EncryptionMethods = EncryptionMethods;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4;
