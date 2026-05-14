import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from './env.js';

const adapter = new PrismaMariaDb({
  host: env.DB_HOST,
  port: 3306,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  connectionLimit: 10,
});

const prisma = new PrismaClient({ adapter });

prisma.$connect()
  .then(() => console.log('[DB] Prisma conectado ao MySQL!'))
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[DB] Erro de conexão Prisma:', message);
  });

export default prisma;
