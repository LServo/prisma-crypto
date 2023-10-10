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
/* eslint-disable no-case-declarations */
require("dotenv/config");
var node_crypto_1 = require("node:crypto");
var client_1 = require("@prisma/client");
var sdk_1 = require("@prisma/sdk");
var encrypted_models_1 = require("./encrypted-models");
var convertToJson = function (variable) {
    return JSON.stringify(variable, null, 2);
};
function getMyVar(env_var) {
    return process.env[env_var];
}
var prismaDirect = new client_1.PrismaClient({
    datasources: {
        db: {
            url: getMyVar("PRISMA_CRYPTO_DIRECT_DB"),
        },
    },
});
var debugMode = getMyVar("PRISMA_CRYPTO_DEBUG") === "true";
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
        if (debugMode)
            sdk_1.logger.info("[resolveEncryptedArgs] whereArgs before:", convertToJson(whereArgs));
        var _c = (_b = whereArgs) !== null && _b !== void 0 ? _b : {}, AND = _c.AND, NOT = _c.NOT, OR = _c.OR;
        var manageArrayEncryption = function (whereData) {
            if (!whereData)
                return;
            var isArray = Array.isArray(whereData);
            switch (isArray) {
                case false:
                    EncryptionMethods.manageEncryption({
                        fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                        dataToEncrypt: whereData,
                        manageMode: "encrypt",
                    });
                    break;
                case true:
                    whereData.forEach(function (item) {
                        if (item && typeof item === "object")
                            EncryptionMethods.manageEncryption({
                                fieldsToManage: JSON.parse(JSON.stringify(fieldsToManage)),
                                dataToEncrypt: item,
                                manageMode: "encrypt",
                            });
                    });
                    break;
                default:
                    break;
            }
        };
        if (whereArgs)
            manageArrayEncryption(whereArgs);
        if (AND)
            manageArrayEncryption(AND);
        if (NOT)
            manageArrayEncryption(NOT);
        if (OR)
            manageArrayEncryption(OR);
        if (debugMode)
            sdk_1.logger.info("[resolveEncryptedArgs] whereArgs after:", convertToJson(whereArgs));
        return {};
    };
    EncryptionMethods.prototype.resolveEncryptedArgs = function (_a) {
        var whereArgs = _a.whereArgs, fieldsToManage = _a.fieldsToManage;
        var deepClonedFieldsToManage = JSON.parse(JSON.stringify(fieldsToManage));
        return EncryptionMethods.resolveEncryptedArgs({
            whereArgs: whereArgs,
            fieldsToManage: deepClonedFieldsToManage,
        });
    };
    EncryptionMethods.manageEncryption = function (_a) {
        var _this = this;
        var dataToEncrypt = _a.dataToEncrypt, fieldsToManage = _a.fieldsToManage, manageMode = _a.manageMode;
        var field = fieldsToManage.shift();
        if (!field)
            return {};
        var isRelation = field.typeName === "Relation";
        var fieldName = !isRelation
            ? field.fieldName
            : field.fieldName.split(">")[0];
        var fieldValue = dataToEncrypt[fieldName];
        if (fieldValue) {
            if (debugMode)
                sdk_1.logger.info("[manageEncryption] dataToEncrypt[".concat(fieldName, "] before:"), convertToJson(dataToEncrypt[fieldName]));
            // função que vai aplicar a criptografia ou decriptografia numa string, levando em consideração o modo de gerenciamento
            var manageEncryptionMode_1 = function (input) {
                var _a, _b;
                var isString = typeof input === "string";
                if (!isString) {
                    sdk_1.logger.error("[managingDatabaseEncryption] Error when encrypting the value \"".concat(input, "\" of the column \"").concat(fieldName, "\": The value is not a string."));
                    process.exit(1);
                }
                switch (manageMode) {
                    case "encrypt":
                        try {
                            input = (_a = EncryptionMethods.encryptData({
                                stringToEncrypt: input,
                            })) === null || _a === void 0 ? void 0 : _a.encryptedString;
                        }
                        catch (error) {
                            sdk_1.logger.error("[managingDatabaseEncryption] Error when encrypting the value \"".concat(input, "\" of the column \"").concat(fieldName, "\": ").concat(error));
                            process.exit(1);
                        }
                        break;
                    case "decrypt":
                        try {
                            input = (_b = EncryptionMethods.decryptData({
                                stringToDecrypt: input,
                            })) === null || _b === void 0 ? void 0 : _b.decryptedString;
                        }
                        catch (error) {
                            sdk_1.logger.error("[managingDatabaseEncryption] Error when decrypting the value \"".concat(input, "\" of the column \"").concat(fieldName, "\": ").concat(error));
                            process.exit(1);
                        }
                        break;
                    default:
                }
                return input;
            };
            // função que vai reconhecer o tipo de dado, que pode ser uma string ou um objeto. Se for uma string, então simplesmente aplicamos a função manageEncryptionMode passando a string como argumento. Se for um objeto, então precisamos verificar se é fruto de um Relacionamento ou não. Caso seja um relacionamento, então iteramos sobre as propriedades do objeto verificando na referência do model relacionado, quais precisamos aplicar a criptografia. Caso não seja um Relacionamento, significa que estamos lidando com parâmetros do prisma, portanto iremos iterar sobre as propriedades do objeto, verificando os parâmetros que podem ser utilizados e aplicando a criptografia no valor se tudo estiver correto.
            var executeEncryption_1 = function (input, field) {
                var isString = typeof input === "string";
                switch (isString) {
                    case false: // se não for uma string, nem uma array, é um objeto
                        switch (isRelation) {
                            case true:
                                var _a = field.fieldName.split(">"), modelName = _a[1];
                                var fieldsToManage_1 = JSON.parse(JSON.stringify(encrypted_models_1.prismaEncryptModels[modelName]));
                                var fieldsNameToManage_1 = fieldsToManage_1.map(function (field) { return field.fieldName; });
                                var applyCryptoToRelation_1 = function (inputObject, reference) {
                                    var objectKeys = Object.keys(reference);
                                    var key = objectKeys.shift();
                                    if (!key)
                                        return;
                                    if (reference[key]) {
                                        var mustManageField = fieldsNameToManage_1.includes(key);
                                        // necessario fazer um novo split para pegar o fieldName e comparar com a key
                                        if (mustManageField) {
                                            inputObject[key] =
                                                manageEncryptionMode_1(inputObject[key]);
                                        }
                                        else {
                                            // se não encontrou diretamente, verificar se é uma tabela pivo
                                            var foundField = fieldsToManage_1.find(function (field) {
                                                if (field.fieldName.includes(">")) {
                                                    var fieldName_1 = field.fieldName.split(">")[0];
                                                    return (fieldName_1 === key);
                                                }
                                                return false;
                                            });
                                            if (foundField) {
                                                // se encontrou um relacionamento dentro de outro, então pegar a referencia para criptografia do model relacionado
                                                var _a = foundField.fieldName.split(">"), otherModelName = _a[1];
                                                var newFieldsToManage_1 = JSON.parse(JSON.stringify(encrypted_models_1.prismaEncryptModels[otherModelName])); // model do user
                                                var isArray_1 = Array.isArray(inputObject[key]);
                                                switch (isArray_1) {
                                                    case true:
                                                        // se for array, precisamos de um loop a mais
                                                        inputObject[key].map(function (item) { return __awaiter(_this, void 0, void 0, function () {
                                                            var itemHead, isCreateRelationMethod;
                                                            return __generator(this, function (_a) {
                                                                itemHead = Object.keys(item)[0];
                                                                isCreateRelationMethod = [
                                                                    "connect",
                                                                    "create",
                                                                    "createMany",
                                                                    "connectOrCreate",
                                                                ].includes(itemHead);
                                                                if (isCreateRelationMethod &&
                                                                    Object.keys(item[itemHead]).length > 1) {
                                                                    throw new Error("It is not allowed to use multiple create methods in the same object. The object \"".concat(item, "\" has more than one create method."));
                                                                }
                                                                this.manageEncryption({
                                                                    dataToEncrypt: isCreateRelationMethod
                                                                        ? item[itemHead]
                                                                        : item,
                                                                    fieldsToManage: newFieldsToManage_1,
                                                                    manageMode: manageMode,
                                                                });
                                                                return [2 /*return*/, item];
                                                            });
                                                        }); });
                                                        break;
                                                    case false:
                                                        var itemHead = Object.keys(inputObject[key])[0];
                                                        var isCreateRelationMethod_1 = [
                                                            "connect",
                                                            "create",
                                                            "createMany",
                                                            "connectOrCreate",
                                                        ].includes(itemHead);
                                                        if (isCreateRelationMethod_1 &&
                                                            Object.keys(inputObject[key]).length > 1) {
                                                            throw new Error("It is not allowed to use multiple create methods in the same object. The object \"".concat(inputObject[key], "\" has more than one create method."));
                                                        }
                                                        _this.manageEncryption({
                                                            dataToEncrypt: isCreateRelationMethod_1 // se for direto um create significa que são operações de create encadeadas, então precisamos pegar o objeto dentro do objeto passando o nome da operação
                                                                ? inputObject[key][itemHead]
                                                                : inputObject[key],
                                                            fieldsToManage: newFieldsToManage_1,
                                                            manageMode: manageMode,
                                                        });
                                                        break;
                                                    default:
                                                }
                                            }
                                        }
                                    }
                                    if (objectKeys.length > 0) {
                                        Reflect.deleteProperty(reference, key);
                                        applyCryptoToRelation_1(inputObject, reference);
                                    }
                                };
                                var createRelationMethods = [
                                    "connect",
                                    "create",
                                    "createMany",
                                    "connectOrCreate",
                                ];
                                var objectProperties_1 = Object.keys(input);
                                var isCreateRelationMethod = createRelationMethods.some(function (method) {
                                    return objectProperties_1.includes(method);
                                });
                                if (isCreateRelationMethod) {
                                    objectProperties_1.forEach(function (method) {
                                        var isArray = Array.isArray(input[method]);
                                        switch (method) {
                                            case "connect":
                                                if (isArray) {
                                                    input[method].forEach(function (item) {
                                                        EncryptionMethods.resolveEncryptedArgs({
                                                            whereArgs: item,
                                                            fieldsToManage: fieldsToManage_1,
                                                        });
                                                    });
                                                }
                                                else {
                                                    EncryptionMethods.resolveEncryptedArgs({
                                                        whereArgs: input[method],
                                                        fieldsToManage: fieldsToManage_1,
                                                    });
                                                }
                                                break;
                                            case "create":
                                                if (isArray) {
                                                    input[method].forEach(function (item) {
                                                        var deepClonedCreateInput = JSON.parse(JSON.stringify(item));
                                                        applyCryptoToRelation_1(item, deepClonedCreateInput);
                                                    });
                                                }
                                                else {
                                                    var deepClonedCreateInput = JSON.parse(JSON.stringify(input[method]));
                                                    applyCryptoToRelation_1(input[method], deepClonedCreateInput);
                                                }
                                                break;
                                            case "connectOrCreate":
                                                if (isArray) {
                                                    input[method].forEach(function (item) {
                                                        var deepClonedConnectOrCreateInput = JSON.parse(JSON.stringify(item["create"]));
                                                        applyCryptoToRelation_1(item["create"], deepClonedConnectOrCreateInput);
                                                        EncryptionMethods.resolveEncryptedArgs({
                                                            whereArgs: item["where"],
                                                            fieldsToManage: fieldsToManage_1,
                                                        });
                                                    });
                                                }
                                                else {
                                                    var deepClonedConnectOrCreateInput = JSON.parse(JSON.stringify(input[method]["create"]));
                                                    applyCryptoToRelation_1(input[method]["create"], deepClonedConnectOrCreateInput);
                                                    EncryptionMethods.resolveEncryptedArgs({
                                                        whereArgs: input[method]["where"],
                                                        fieldsToManage: fieldsToManage_1,
                                                    });
                                                }
                                                break;
                                            case "createMany":
                                                input[method]["data"].forEach(function (item) {
                                                    var deepClonedCreateManyInput = JSON.parse(JSON.stringify(item));
                                                    applyCryptoToRelation_1(item, deepClonedCreateManyInput);
                                                });
                                                break;
                                            default:
                                                break;
                                        }
                                    });
                                }
                                else {
                                    // se não tem os métodos, quer dizer que estamos tentando ler um resultado de busca por relacionamento
                                    var deepClonedInput = JSON.parse(JSON.stringify(input));
                                    applyCryptoToRelation_1(input, deepClonedInput);
                                }
                                break;
                            case false:
                                Object.keys(input).forEach(function (key) {
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
                                    if (!input[key])
                                        return;
                                    input[key] = manageEncryptionMode_1(input[key]);
                                });
                                break;
                            default:
                        }
                        break;
                    case true:
                        input = manageEncryptionMode_1(input);
                        break;
                    default:
                }
                return input;
            };
            var isArray = Array.isArray(fieldValue);
            switch (isArray) {
                case false:
                    dataToEncrypt[fieldName] = executeEncryption_1(dataToEncrypt[fieldName], field);
                    break;
                case true:
                    // eslint-disable-next-line no-param-reassign
                    dataToEncrypt[fieldName] = dataToEncrypt[fieldName].map(function (item) {
                        item = executeEncryption_1(item, field);
                        return item;
                    });
                    break;
                default:
                    break;
            }
            if (debugMode)
                sdk_1.logger.info("[manageEncryption] dataToEncrypt[".concat(fieldName, "] after:"), convertToJson(dataToEncrypt[fieldName]));
        }
        if ((fieldsToManage === null || fieldsToManage === void 0 ? void 0 : fieldsToManage.length) > 0)
            this.manageEncryption({
                dataToEncrypt: dataToEncrypt,
                fieldsToManage: fieldsToManage,
                manageMode: manageMode,
            });
        return {};
    };
    EncryptionMethods.prototype.manageEncryption = function (_a) {
        var manageMode = _a.manageMode, dataToEncrypt = _a.dataToEncrypt, fieldsToManage = _a.fieldsToManage;
        var deepClonedFieldsToManage = JSON.parse(JSON.stringify(fieldsToManage));
        return EncryptionMethods.manageEncryption({
            manageMode: manageMode,
            dataToEncrypt: dataToEncrypt,
            fieldsToManage: deepClonedFieldsToManage,
        });
    };
    EncryptionMethods.encryptData = function (_a) {
        var stringToEncrypt = _a.stringToEncrypt;
        if (debugMode)
            sdk_1.logger.info("[encryptData] stringToEncrypt:", stringToEncrypt);
        var fixedIV = EncryptionMethods.generateHash({
            stringToGenerateHash: stringToEncrypt,
        }).generatedHash;
        var cipher = (0, node_crypto_1.createCipheriv)("aes-256-gcm", getMyVar("PRISMA_CRYPTO_SECRET_KEY"), fixedIV);
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
        if (debugMode)
            sdk_1.logger.info("[encryptData] encryptedString:", encryptedString);
        return { encryptedString: encryptedString };
    };
    EncryptionMethods.prototype.encryptData = function (_a) {
        var stringToEncrypt = _a.stringToEncrypt;
        return EncryptionMethods.encryptData({ stringToEncrypt: stringToEncrypt });
    };
    EncryptionMethods.decryptData = function (_a) {
        var stringToDecrypt = _a.stringToDecrypt;
        if (debugMode)
            sdk_1.logger.info("[decryptData] stringToDecrypt:", stringToDecrypt);
        var encryptedBuffer = Buffer.from(stringToDecrypt, "base64");
        // Extraia o IV, a tag e o texto cifrado da string codificada
        var iv = encryptedBuffer.subarray(0, 32);
        var tag = encryptedBuffer.subarray(32, 48);
        var encrypted = encryptedBuffer.subarray(48);
        var decipher = (0, node_crypto_1.createDecipheriv)("aes-256-gcm", getMyVar("PRISMA_CRYPTO_SECRET_KEY"), iv);
        decipher.setAuthTag(tag);
        var decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);
        var decryptedString = decrypted.toString("utf8");
        if (debugMode)
            sdk_1.logger.info("[decryptData] decryptedString:", decryptedString);
        return { decryptedString: decryptedString };
    };
    EncryptionMethods.prototype.decryptData = function (_a) {
        var stringToDecrypt = _a.stringToDecrypt;
        return EncryptionMethods.decryptData({ stringToDecrypt: stringToDecrypt });
    };
    EncryptionMethods.managingDatabaseEncryption = function (fields, fieldsDbName, action) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function () {
            var actualField, actualFieldDbName, _e, schemaTableName, columnName, dbTableName, isRelation, result, columnExists, columnType, columnDataType, isArrayColumn_1, isTextColumn, getModelPrimaryKey, primaryKeyColumnName_1, allEntries, createPrismaTransactions;
            var _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        if (debugMode)
                            sdk_1.logger.info("[managingDatabaseEncryption] index:", fields.length);
                        actualField = fields.shift();
                        if (debugMode)
                            sdk_1.logger.info("[managingDatabaseEncryption] actualField:", actualField);
                        actualFieldDbName = fieldsDbName.shift();
                        if (!actualField)
                            return [2 /*return*/];
                        _e = actualField.split("."), schemaTableName = _e[0], columnName = _e[1];
                        dbTableName = actualFieldDbName.split(".")[0];
                        isRelation = columnName.includes(">");
                        if (!!isRelation) return [3 /*break*/, 5];
                        if (debugMode) {
                            sdk_1.logger.info("[managingDatabaseEncryption] schemaTableName:", actualField);
                            sdk_1.logger.info("[managingDatabaseEncryption] dbTableName:", dbTableName);
                            sdk_1.logger.info("[managingDatabaseEncryption] columnName:", columnName);
                        }
                        return [4 /*yield*/, prismaDirect
                                .$queryRaw(client_1.Prisma.sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT EXISTS (\n                    SELECT FROM information_schema.columns\n                    WHERE table_name = ", "\n                    AND column_name = ", "\n                    ) AS \"exists\""], ["SELECT EXISTS (\n                    SELECT FROM information_schema.columns\n                    WHERE table_name = ", "\n                    AND column_name = ", "\n                    ) AS \"exists\""])), dbTableName, columnName))
                                .catch(function (error) {
                                throw new Error("Error when executing the query to check if the column ".concat(dbTableName, ".").concat(columnName, " exists: ").concat(error));
                            })];
                    case 1:
                        result = _h.sent();
                        columnExists = (_a = result[0]) === null || _a === void 0 ? void 0 : _a.exists;
                        if (debugMode)
                            sdk_1.logger.info("[managingDatabaseEncryption] columnExists:", columnExists);
                        if (!columnExists) {
                            throw new Error("The column ".concat(dbTableName, ".").concat(columnName, " does not exists in the database."));
                        }
                        return [4 /*yield*/, prismaDirect
                                .$queryRaw(client_1.Prisma.sql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["SELECT data_type FROM information_schema.columns WHERE table_name = ", " AND column_name = ", ";"], ["SELECT data_type FROM information_schema.columns WHERE table_name = ", " AND column_name = ", ";"])), dbTableName, columnName))
                                .catch(function (error) {
                                throw new Error("Error when executing the query to get the column type of ".concat(dbTableName, ".").concat(columnName, ": ").concat(error));
                            })];
                    case 2:
                        columnType = _h.sent();
                        columnDataType = (_b = columnType[0]) === null || _b === void 0 ? void 0 : _b.data_type;
                        isArrayColumn_1 = columnDataType === "ARRAY";
                        isTextColumn = columnDataType === "text";
                        if (debugMode)
                            sdk_1.logger.info("[managingDatabaseEncryption] columnDataType:", columnDataType);
                        if (!isTextColumn && !isArrayColumn_1) {
                            throw new Error("The column ".concat(dbTableName, ".").concat(columnName, " is not of type \"text\"."));
                        }
                        return [4 /*yield*/, prismaDirect
                                .$queryRaw(client_1.Prisma.sql(templateObject_3 || (templateObject_3 = __makeTemplateObject(["SELECT column_name FROM information_schema.key_column_usage WHERE table_name = ", " AND constraint_name = ", ";"], ["SELECT column_name FROM information_schema.key_column_usage WHERE table_name = ", " AND constraint_name = ", ";"])), dbTableName, dbTableName + "_pkey"))
                                .catch(function (error) {
                                throw new Error("Error when executing the query to get the primary key of ".concat(dbTableName, ": ").concat(error));
                            })];
                    case 3:
                        getModelPrimaryKey = _h.sent();
                        primaryKeyColumnName_1 = (_c = getModelPrimaryKey[0]) === null || _c === void 0 ? void 0 : _c.column_name;
                        return [4 /*yield*/, prismaDirect[schemaTableName]
                                .findMany({
                                select: (_f = {},
                                    _f[primaryKeyColumnName_1] = true,
                                    _f[columnName] = true,
                                    _f),
                            })
                                .catch(function (error) {
                                throw new Error("Error when executing the query to get all entries of ".concat(schemaTableName, ": ").concat(error));
                            })];
                    case 4:
                        allEntries = _h.sent();
                        if (debugMode)
                            sdk_1.logger.info("[managingDatabaseEncryption] allEntries:", allEntries);
                        createPrismaTransactions = allEntries
                            .map(function (entry) {
                            var _a, _b;
                            var _c = entry, _d = primaryKeyColumnName_1, id = _c[_d], _e = columnName, value = _c[_e];
                            if (debugMode) {
                                sdk_1.logger.info("[managingDatabaseEncryption] primaryKeyColumnName:", primaryKeyColumnName_1);
                                sdk_1.logger.info("[managingDatabaseEncryption] columnName:", columnName);
                                sdk_1.logger.info("[managingDatabaseEncryption] value:", value);
                            }
                            if (!value)
                                return;
                            var newValue;
                            // adicionar validação para caso seja uma array, verificar se cada tipo é uma string e efetuar criptografia nos valores
                            var manageEncryption = function (input) {
                                var _a, _b;
                                var output;
                                switch (action) {
                                    case "add":
                                        try {
                                            output = (_a = EncryptionMethods.encryptData({
                                                stringToEncrypt: input,
                                            })) === null || _a === void 0 ? void 0 : _a.encryptedString;
                                        }
                                        catch (error) {
                                            sdk_1.logger.error("[managingDatabaseEncryption] Error when encrypting the value \"".concat(input, "\" of the column \"").concat(columnName, "\" of the table \"").concat(schemaTableName, "\": ").concat(error));
                                            process.exit(1);
                                        }
                                        break;
                                    case "remove":
                                        try {
                                            output = (_b = EncryptionMethods.decryptData({
                                                stringToDecrypt: input,
                                            })) === null || _b === void 0 ? void 0 : _b.decryptedString;
                                        }
                                        catch (error) {
                                            sdk_1.logger.error("[managingDatabaseEncryption] Error when decrypting the value \"".concat(input, "\" of the column \"").concat(columnName, "\" of the table \"").concat(schemaTableName, "\": ").concat(error));
                                            process.exit(1);
                                        }
                                        break;
                                    default:
                                        output = input;
                                        break;
                                }
                                return output;
                            };
                            if (isArrayColumn_1) {
                                var isArrayOfStrings = function (array) {
                                    return array.every(function (item) { return typeof item === "string"; });
                                };
                                if (!isArrayOfStrings(value)) {
                                    sdk_1.logger.error("[managingDatabaseEncryption] The column \"".concat(columnName, "\" of the table \"").concat(schemaTableName, "\" is an array, but it is not an array of strings."));
                                    process.exit(1);
                                }
                                newValue = value.map(function (item) {
                                    return manageEncryption(item);
                                });
                            }
                            else {
                                newValue = manageEncryption(value);
                            }
                            if (debugMode) {
                                sdk_1.logger.info("[managingDatabaseEncryption] newValue:", newValue);
                                sdk_1.logger.info("[managingDatabaseEncryption] return prisma[".concat(schemaTableName, "].update({\n                        where: { [").concat(primaryKeyColumnName_1, "]: ").concat(id, " },\n                        data: { [").concat(columnName, "]: ").concat(newValue, " },\n                    });"));
                            }
                            return prismaDirect[schemaTableName].update({
                                where: (_a = {}, _a[primaryKeyColumnName_1] = id, _a),
                                data: (_b = {}, _b[columnName] = newValue, _b),
                            });
                        })
                            .filter(Boolean);
                        (_g = this.AllPrismaTransactions).push.apply(_g, createPrismaTransactions);
                        _h.label = 5;
                    case 5:
                        if (!((fields === null || fields === void 0 ? void 0 : fields.length) > 0)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.managingDatabaseEncryption(fields, fieldsDbName, action)];
                    case 6:
                        _h.sent();
                        _h.label = 7;
                    case 7:
                        if (!(((_d = this.AllPrismaTransactions) === null || _d === void 0 ? void 0 : _d.length) > 0)) return [3 /*break*/, 9];
                        return [4 /*yield*/, prismaDirect.$transaction(this.AllPrismaTransactions)];
                    case 8:
                        _h.sent();
                        this.AllPrismaTransactions = [];
                        _h.label = 9;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    EncryptionMethods.AllPrismaTransactions = [];
    return EncryptionMethods;
}());
exports.EncryptionMethods = EncryptionMethods;
var templateObject_1, templateObject_2, templateObject_3;
