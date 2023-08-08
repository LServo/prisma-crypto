"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionMethods = void 0;
var node_crypto_1 = require("node:crypto");
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
    return EncryptionMethods;
}());
exports.EncryptionMethods = EncryptionMethods;
