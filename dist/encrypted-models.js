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
        },
        {
            "fieldName": "CellPhoneCalls>CellPhoneCalls",
            "typeName": "Relation"
        }
    ],
    "CellPhoneCalls": [
        {
            "fieldName": "CellPhone>CellPhone",
            "typeName": "Relation"
        },
        {
            "fieldName": "Call>Call",
            "typeName": "Relation"
        }
    ],
    "Call": [
        {
            "fieldName": "CellPhoneCalls>CellPhoneCalls",
            "typeName": "Relation"
        },
        {
            "fieldName": "CallsHistory>CallsHistory",
            "typeName": "Relation"
        }
    ],
    "CallsHistory": [
        {
            "fieldName": "Call>Call",
            "typeName": "Relation"
        }
    ]
};