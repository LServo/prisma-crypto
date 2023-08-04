Este pacote foi desenvolvido com o objetivo de fornecer uma criptografia de maneira prática utilizando hooks do prisma.

A criptografia será executada utilizando o algoritmo `aes-256-gcm` e aplicando criptografia determinística através de hashs da string-valor desejada.

Para que a criptografia funcione, é importante que os campos sejam do tipo String | String? | String[]

É necessário adicionar a notação de comentário `// @encrypt` ao fim da linha do campo que deseja criptografar, no próprio `schema.prisma`

---

Todo o processo de reconhecimento de campos a criptografar será feito automagicamente e uma lista de campos a criptografar será gerada com o nome `prismaEncryptFields`.

Será gerado também um client do prisma, que fará o redirecionamento dos métodos de escrita para a réplica de escrita, e os de leitura para a réplica de leitura.
O Client também estará configurado para lidar com a criptografia na entrada e na saída dos dados de maneira automática

Utilizando a criptografia determinística conseguimos comparar diretamente valores igualmente criptografados no banco de dados, porém,  operações como `contains` e `in` não irão funcionar. Sendo necessário que você busque um grupo de usuários e faça a operação de comparação manualmente nos dados já descriptografados.

---

Será necessário ter as seguintes variáveis de ambiente configuradas:
- PRISMA_MIGRATE -> URL utilizada nas migrations aka `shadow database``
- PRISMA_WRITE -> URL da instância de escrita
- PRISMA_READ -> URL da instância de leitura
- SECRET_KEY -> O segredo utilizado na criptografia dos dados