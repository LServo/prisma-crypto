import { PrismaCrypto } from "./prisma-crypto";
declare class EncryptionMethods implements PrismaCrypto.EncryptionMethods {
    generateHash({ stringToGenerateHash, }: PrismaCrypto.GenerateHash.Input): PrismaCrypto.GenerateHash.Output;
    resolveEncryptedArgs({ whereArgs, fieldsToManage, }: PrismaCrypto.ResolveEncryptedArgs.Input): PrismaCrypto.ResolveEncryptedArgs.Output;
    manageEncryption({ dataToEncrypt, fieldsToManage, manageMode, }: PrismaCrypto.ManageEncryption.Input): PrismaCrypto.ManageEncryption.Output;
    encryptData({ stringToEncrypt, }: PrismaCrypto.EncryptData.Input): PrismaCrypto.EncryptData.Output;
    decryptData({ stringToDecrypt, }: PrismaCrypto.DecryptData.Input): PrismaCrypto.DecryptData.Output;
}
export { EncryptionMethods };
