# Prisma-Crypto: Automated Encryption for Prisma ORM

[![npm version](https://img.shields.io/npm/v/prisma-crypto.svg?style=flat-square)](https://www.npmjs.com/package/prisma-crypto)
[![NPM Downloads](https://img.shields.io/npm/dt/prisma-crypto.svg?style=flat-square)](https://www.npmjs.com/package/prisma-crypto)
[![GitHub issues](https://img.shields.io/github/issues-raw/LServo/prisma-crypto?style=flat-square)](https://github.com/LServo/prisma-crypto/issues)
[![Code Coverage](https://img.shields.io/codecov/c/github/LServo/prisma-crypto?style=flat-square)](https://codecov.io/gh/LServo/prisma-crypto)
<!-- [![GitHub Actions](https://github.com/LServo/prisma-crypto/workflows/CI/badge.svg)](https://github.com/LServo/prisma-crypto/actions) -->
<br>

The `prisma-crypto` is an extension for the Prisma ORM that simplifies the implementation of encryption in your database models. With a simple annotation and some configurations, you can ensure that your data is stored securely while still maintaining the ability to query these data efficiently.

---

## 📑 Table of Contents

- [Installation](#-installation)
- [Environment Configuration](#-environment-configuration)
- [Schema Configuration](#-schema-configuration)
- [Usage](#-usage)
- [Technical Details](#-technical-details)
- [Use Cases](#-use-cases)
- [Contribution](#-contribution)
- [License](#-license)

---

## 🚀 Installation

```bash
npm install prisma-crypto
```

or

```bash
yarn add prisma-crypto
```

---

## 🌐 Environment Configuration

Before starting, set up the following environment variables:

```bash
- PRISMA_CRYPTO_SECRET_KEY="" #Your secret key for encryption. Must be 32 characters
- PRISMA_CRYPTO_DIRECT_DB="" #Direct connection to the database. Useful for development environments with Docker.
- PRISMA_CRYPTO_WRITE_DB="" #Connection to the write instance. Used for write operations via Prisma Client.
- PRISMA_CRYPTO_READ_DB="" #Connection to the read instance. Used for read operations via Prisma Client.
- PRISMA_CRYPTO_DEBUG=false #Activate to get detailed logs of the package's operation.
```

In scenarios where the prisma client has not yet been initialized - as in the case of a project that has just been cloned - it will be necessary to do so. We recommend that you configure a post-installation script, as follows:

```jsonc
{ // package.json
  "scripts": {
    "postinstall": "npx prisma generate --generator client",
    // other scripts here
  },
  // other configs here
}
```


This way, whenever you run an `npm i` your prisma client will automatically be initialized. If you don't want to add the script, just run the command `npx prisma generate --generator client` manually via CLI.

---

## 📝 Schema Configuration

In your `schema.prisma`, setup a new generator and add the `@encrypt` annotation to the fields you want to encrypt.

```prisma
generator encrypt {
    provider = "prisma-crypto"
}

model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique // @encrypt
  password String  // @encrypt
}
```

---

## 🛠 Usage

With `prisma-crypto` set up, run your Prisma operations as usual. The extension will handle encryption and decryption for you.

```typescript
import { PrismaCrypto } from "prisma-crypto";

const prisma = new PrismaCrypto().getPrismaClient();

const newUser = {
  email: 'example@example.com',
  password: 'securePassword',
};

await prisma.user.create({
  data: newUser,
});
```
When retrieving the user, the encrypted fields will be automatically decrypted:

```typescript
import { PrismaCrypto } from "prisma-crypto";

const prisma = new PrismaCrypto().getPrismaClient();

const userEmail = 'example@example.com';

const user = await prisma.user.findUnique({
  where: {
    email: userEmail,
  },
});

console.log(user.password); // 'securePassword'
```
If necessary, you can call Prisma Crypto's encryption/decryption methods manually:

```typescript
import { EncryptionMethods } from "@paipe/prisma-crypto";

const encryptedString = EncryptionMethods.encryptData("test");
const decryptedString = EncryptionMethods.decryptData("test");
```
---

## 📖 Technical Details

### Encryption Algorithm

The `prisma-crypto` uses the `aes-256-gcm` algorithm for encryption. This is a symmetric encryption algorithm that is widely recognized for its security and efficiency.

### Deterministic Encryption

To allow queries on encrypted fields, the `prisma-crypto` uses a deterministic approach, where the same input will always produce the same encrypted output. This is achieved through the use of hashes.

### Limitations

- Only `string` or `string[]` fields can be encrypted.
- The package has been optimized for use with PostgreSQL.
- Operations like LIKE and IN are not supported on encrypted fields.

---

## 🎯 Use Cases

### Saving Data with Encryption
When creating or updating records, fields marked with `@encrypt` will be automatically encrypted.

### Querying Encrypted Data
When querying encrypted data, the `prisma-crypto` applies encryption to the query values to ensure the correct results are returned.

### Retrieving Encrypted Data
When retrieving records, the encrypted fields will be automatically decrypted.

### Change History for Data Encryption
Keep a record of all changes made to encrypted data, including which data was added or removed from the encryption list.

---

## 🤝 Contribution

Contributions are welcome! Check the contribution guide for details.

---

## 📜 License

This project is licensed under the MIT license.

---

Developed with ❤️ by Lucas Servo.  
📧 Contact: [l.servo@hotmail.com](mailto:l.servo@hotmail.com)