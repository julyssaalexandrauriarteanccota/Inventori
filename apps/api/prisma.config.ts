import { config } from 'dotenv';
import { resolve } from 'path';
import { defineConfig } from 'prisma/config';

config({ path: resolve(process.cwd(), '../../.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx src/database/seed.ts',
  },
  datasource: {
    // Prisma CLI (migrate / db push / studio) prefiere `DIRECT_URL` cuando
    // existe — necesario en Supabase/PgBouncer porque el pooler en modo
    // transaction no soporta sentencias preparadas que usa `prisma migrate`.
    // El runtime de la API sigue usando `DATABASE_URL` (pooler) vía PrismaPg.
    url: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'],
  },
});
