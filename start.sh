npm run build
docker compose --file ./test/compose.yaml up -d --wait db_test
npx prisma migrate deploy --schema=./test/schema.prisma
npx prisma generate --generator client --generator prisma_crypto  --schema=./test/schema.prisma
git restore prisma/schema.prisma