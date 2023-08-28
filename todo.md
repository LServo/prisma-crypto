- Sanatizar métodos de criptografia e decriptografia, para - através da autenticação da tag - descobrir se uma string já está criptografada ou não, antes de prosseguir.  Tendo esta informação, o método de criptografia não precisa aplicar criptografia numa string que já está criptografada, por exemplo.

- Separar funcionamento do migrate encryption em duas etapas, criando um comando para aplicar a migrate encryption.
    A `_migrate_encryption` ganharia mais uma coluna para guardar o status de `applied`.
    Teríamos uma configuração no generator do `schema.prisma` chamada `auto-apply-migrate`, podendo ser `true` ou `false`.
    Sendo `false` seria apenas criado o novo registro da `_migrate_encryption` com o campo `applied` setado como `false`. 
    Seria necessário ter um comando específico como `prisma-crypto apply` para aplicar a última `_migrate_encryption` no banco quando desejado.

- criar caso de teste utilizando tabela e relacionamentos pivo