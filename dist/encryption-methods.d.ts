import { PrismaCrypto } from "./prisma-crypto";
declare class EncryptionMethods implements PrismaCrypto.EncryptionMethods {
    static generateHash({ stringToGenerateHash, }: PrismaCrypto.GenerateHash.Input): PrismaCrypto.GenerateHash.Output;
    generateHash({ stringToGenerateHash, }: PrismaCrypto.GenerateHash.Input): PrismaCrypto.GenerateHash.Output;
    static resolveEncryptedArgs({ whereArgs, fieldsToManage, }: PrismaCrypto.ResolveEncryptedArgs.Input): PrismaCrypto.ResolveEncryptedArgs.Output;
    resolveEncryptedArgs({ whereArgs, fieldsToManage, }: PrismaCrypto.ResolveEncryptedArgs.Input): PrismaCrypto.ResolveEncryptedArgs.Output;
    static manageEncryption({ dataToEncrypt, fieldsToManage, manageMode, }: PrismaCrypto.ManageEncryption.Input): PrismaCrypto.ManageEncryption.Output;
    manageEncryption({ manageMode, dataToEncrypt, fieldsToManage, }: PrismaCrypto.ManageEncryption.Input): PrismaCrypto.ManageEncryption.Output;
    static encryptData({ stringToEncrypt, }: PrismaCrypto.EncryptData.Input): PrismaCrypto.EncryptData.Output;
    encryptData({ stringToEncrypt, }: PrismaCrypto.EncryptData.Input): PrismaCrypto.EncryptData.Output;
    static decryptData({ stringToDecrypt, }: PrismaCrypto.DecryptData.Input): PrismaCrypto.DecryptData.Output;
    decryptData({ stringToDecrypt, }: PrismaCrypto.DecryptData.Input): PrismaCrypto.DecryptData.Output;
    static managingDatabaseEncryption(fields: String[], fieldsDbName: String[], action: "add" | "remove"): Promise<void>;
}
export { EncryptionMethods };
