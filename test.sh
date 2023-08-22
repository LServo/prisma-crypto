npx prisma migrate reset --force --skip-seed --schema=./test/schema.prisma #--skip-generate (não dá pra usar porque o prisma migrate deleta a _ migrate_encryption)
npx vitest