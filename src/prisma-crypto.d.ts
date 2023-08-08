/* eslint-disable @typescript-eslint/no-unused-vars */ /* eslint-disable no-unused-vars */
export namespace PrismaCrypto {
    /**
     * @description Interface de Campos Criptografados
     * @example
     * interface PrismaEncryptField {
     *  fieldName: string;
     *  typeName: string;
     * }
     */
    interface PrismaEncryptField {
        fieldName: string;
        typeName: string;
    }

    /**
     * @description Interface de Campos Criptografados por Model
     * @example
     * interface PrismaEncryptModels {
     *   [key: string]: PrismaEncryptField[];
     * }
     */
    export interface PrismaEncryptModels {
        [key: string]: PrismaEncryptField[];
    }

    /**
     * @description Interface da Entidade `MigrateEncryption`
     * @example
     * interface MigrateEncryption {
     *  id: number;
     *  token: string;
     *  add_encryption: string[];
     *  remove_encryption: string[];
     *  created_at: Date;
     * }
     */
    export interface MigrateEncryption {
        id: number;
        token: string;
        add_encryption: string[];
        remove_encryption: string[];
        created_at: Date;
    }

    namespace ResolveEncryptedArgs {
        /**
         * @description Interface de Entrada para o método `resolveEncryptedArgs`
         * @example
         * interface Input {
            whereArgs: unknown;
            fieldsToManage: PrismaEncryptField[];
         * }
         */
        interface Input {
            whereArgs: unknown;
            fieldsToManage: PrismaEncryptField[];
        }

        /**
         * @description Interface de Saída para o método `resolveEncryptedArgs`
         * @example
         * interface Output {}
         */
        interface Output {}
    }

    namespace ManageEncryption {
        /**
         * @description Interface de Entrada para o método `manageEncryption`
         * @example
         * interface Input {
            fieldsToManage: PrismaEncryptField[];
            dataToEncrypt: unknown;
            manageMode: "encrypt" | "decrypt";
         * }
         */
        interface Input {
            fieldsToManage: PrismaEncryptField[];
            dataToEncrypt: unknown;
            manageMode: "encrypt" | "decrypt";
        }

        /**
         * @description Interface de Saída para o método `manageEncryption`
         * @example
         * interface Output {}
         */
        interface Output {}
    }

    namespace EncryptData {
        /**
         * @description Interface de Entrada para o método `encryptData`
         * @example
         * interface Input {
            stringToEncrypt: string;
         * }
         */
        interface Input {
            stringToEncrypt: string;
        }

        /**
         * @description Interface de Saída para o método `encryptData`
         * @example
         * interface Output {
            encryptedString: string;
         * }
         */
        interface Output {
            encryptedString: string;
        }
    }

    namespace DecryptData {
        /**
         * @description Interface de Entrada para o método `decryptData`
         * @example
         * interface Input {
            stringToDecrypt: string;
         * }
         */
        interface Input {
            stringToDecrypt: string;
        }

        /**
         * @description Interface de Saída para o método `decryptData`
         * @example
         * interface Output {
            decryptedString: string;
         * }
         */
        interface Output {
            decryptedString: string;
        }
    }

    namespace GenerateHash {
        /**
         * @description Interface de Entrada para o método `generateHash`
         * @example
         * interface Input {
         *    stringToGenerateHash: string;
         * }
         */
        interface Input {
            stringToGenerateHash: string;
        }

        /**
         * @description Interface de Saída para o método `generateHash`
         * @example
         * interface Output {
         *   generatedHash: Buffer;
         * }
         */
        interface Output {
            generatedHash: Buffer;
        }
    }

    /**
     * @description Interface de Métodos do PrismaCrypto
     */
    export interface EncryptionMethods {
        /**
         * @description Gera um hash de 32 bytes a partir de uma string
         * @operational
         *  - O hash é fixo, ou seja, sempre que a mesma string for passada como argumento, o mesmo hash será gerado
         *  - Será utilizado o algorithm "sha256" para gerar o hash
         * @param stringToGenerateHash Dados a serem criptografados
         * @returns Hash gerado a partir dos dados, em formato de buffer
         */
        generateHash({
            stringToGenerateHash,
        }: GenerateHash.Input): GenerateHash.Output;

        /**
         * @description Criptografar os dados e retornar uma string codificada
         * @param stringToEncrypt Dados a serem criptografados
         * @returns String codificada com os dados criptografados
         */
        encryptData({ stringToEncrypt }: EncryptData.Input): EncryptData.Output;

        /**
         * @description Descriptografar os dados a partir da string codificada
         * @param stringToDecrypt String codificada com os dados criptografados
         * @returns Dados descriptografados
         */
        decryptData({ stringToDecrypt }: DecryptData.Input): DecryptData.Output;

        /**
         * @description Criptografar argumentos de leitura que também estão criptografados no banco para se utilizar de leitura determinística
         * @param whereArgs Argumento `where` da requisição
         * @param fieldsToManage Campos que precisam ser criptografados no model
         */
        resolveEncryptedArgs({
            whereArgs,
            fieldsToManage,
        }: ResolveEncryptedArgs.Input): ResolveEncryptedArgs.Output;

        /**
         * @description Aplicar ou Remover a Criptografia
         * @param manageMode Modo de operação: "encrypt" ou "decrypt", para alterar o comportamento na escrita ou leitura de dados, respectivamente
         * @param dataToEncrypt Dados enviados na requisição
         * @param fieldsToManage Campos que precisam ser criptografados no model
         */
        manageEncryption({
            manageMode,
            dataToEncrypt,
            fieldsToManage,
        }: ManageEncryption.Input): ManageEncryption.Output;
    }
}
