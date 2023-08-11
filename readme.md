# Prisma-Crypto: Criptografia Automatizada para Prisma ORM

[![npm version](https://img.shields.io/npm/v/prisma-crypto.svg?style=flat-square)](https://www.npmjs.com/package/prisma-crypto)
[![NPM Downloads](https://img.shields.io/npm/dt/prisma-crypto.svg?style=flat-square)](https://www.npmjs.com/package/prisma-crypto)
[![GitHub issues](https://img.shields.io/github/issues-raw/paipe/prisma-crypto?style=flat-square)](https://github.com/LServo/prisma-crypto/issues)
[![Code Coverage](https://img.shields.io/codecov/c/github/paipe/prisma-crypto?style=flat-square)](https://codecov.io/gh/LServo/prisma-crypto)
<!-- [![GitHub Actions](https://github.com/paipe/prisma-crypto/workflows/CI/badge.svg)](https://github.com/LServo/prisma-crypto/actions) //é necessário ter um workflow ativo com o nome CI para funcionar -->
<br>

O `prisma-crypto` é uma extensão para o Prisma ORM que facilita a implementação de criptografia em seus modelos de banco de dados. Com uma simples anotação e algumas configurações, você pode garantir que seus dados sejam armazenados de forma segura e ainda mantenha a capacidade de consultar esses dados de forma eficiente.

---

## 📑 Tabela de Conteúdos

- [Instalação](#-instalação)
- [Configuração de Ambiente](#-configuração-de-ambiente)
- [Configuração no Schema](#-configuração-no-schema)
- [Uso](#-uso)
- [Detalhes Técnicos](#-detalhes-técnicos)
- [Cenários de Uso](#-cenários-de-uso)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

---

## 🚀 Instalação

```bash
npm install prisma-crypto
```

ou

```bash
yarn add prisma-crypto
```

---

## 🌐 Configuração de Ambiente

Antes de começar, configure as seguintes variáveis de ambiente:

- `PRISMA_CRYPTO_SECRET_KEY`: Sua chave secreta para criptografia.
- `PRISMA_CRYPTO_DIRECT_DB`: Conexão direta com o banco. Útil para ambientes de desenvolvimento com Docker.
- `PRISMA_CRYPTO_WRITE_DB`: Conexão para a instância de escrita. Utilizada para operações de escrita via Prisma Client.
- `PRISMA_CRYPTO_READ_DB`: Conexão para a instância de leitura. Utilizada para operações de leitura via Prisma Client.
- `PRISMA_CRYPTO_DEBUG`: Ative para obter logs detalhados do funcionamento do pacote.

---

## 📝 Configuração no Schema

No seu `schema.prisma`, adicione a anotação `@encrypt` aos campos que você deseja criptografar.

```prisma
model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique // @encrypt
  password String  // @encrypt
}
```

---

## 🛠 Uso

Com o `prisma-crypto` configurado, execute suas operações do Prisma como de costume. A extensão cuidará da criptografia e descriptografia para você.

```typescript
import { prisma } from "@paipe/prisma-crypto";

const newUser = {
  email: 'example@example.com',
  password: 'securePassword',
};

await prisma.user.create({
  data: newUser,
});
```
Ao recuperar o usuário, os campos criptografados serão automaticamente descriptografados:

```typescript
import { prisma } from "@paipe/prisma-crypto";

const userEmail = 'example@example.com';

const user = await prisma.user.findUnique({
  where: {
    email: userEmail,
  },
});

console.log(user.password); // 'securePassword'
```

---

## 📖 Detalhes Técnicos

### Algoritmo de Criptografia

O `prisma-crypto` utiliza o algoritmo `aes-256-gcm` para criptografia. Este é um algoritmo simétrico de criptografia que é amplamente reconhecido por sua segurança e eficiência.

### Criptografia Determinística

Para permitir consultas em campos criptografados, o `prisma-crypto` utiliza uma abordagem determinística, onde a mesma entrada sempre produzirá a mesma saída criptografada. Isso é alcançado através do uso de hashes.

### Limitações

- Apenas campos `string` ou `string[]` podem ser criptografados.
- O pacote foi otimizado para uso com PostgreSQL.
- Operações como LIKE e IN não são suportadas em campos criptografados.

---

## 🎯 Cenários de Uso

### Salvando Dados com Criptografia
Ao criar ou atualizar registros, os campos marcados com `@encrypt` serão automaticamente criptografados.

### Consulta em Dados Criptografados
Ao consultar dados criptografados, o `prisma-crypto` aplica a criptografia nos valores de consulta para garantir que os resultados corretos sejam retornados.

### Recuperando Dados Criptografados
Ao recuperar registros, os campos criptografados serão automaticamente descriptografados.

### Histórico de Mudanças para Criptografia de Dados
Mantenha um registro de todas as alterações feitas nos dados criptografados, incluindo quais dados foram adicionados ou removidos da lista de criptografia.

---

## 🤝 Contribuição

Contribuições são bem-vindas! Consulte o guia de contribuição para obter detalhes.

---

## 📜 Licença

Este projeto está licenciado sob a licença MIT.

---

Desenvolvido com ❤️ por Lucas Servo.  
📧 Contato: [l.servo@hotmail.com](mailto:l.servo@hotmail.com)