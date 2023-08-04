interface IPrismaEncryptFields {
    [key: string]: {
        fieldName: string;
        typeName: string;
    }[];
}

export const prismaEncryptFields: IPrismaEncryptFields = {};
