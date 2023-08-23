"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaEncryptModels = void 0;
exports.prismaEncryptModels = {
    "User": [
        {
            "fieldName": "email",
            "typeName": "String"
        },
        {
            "fieldName": "name",
            "typeName": "String"
        },
        {
            "fieldName": "password",
            "typeName": "String"
        },
        {
            "fieldName": "CellPhone>CellPhone",
            "typeName": "Relation"
        }
    ],
    "CellPhone": [
        {
            "fieldName": "number",
            "typeName": "String"
        },
        {
            "fieldName": "User>User",
            "typeName": "Relation"
        }
    ]
};