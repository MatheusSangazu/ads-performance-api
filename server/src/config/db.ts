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
  allowPublicKeyRetrieval: true,
  charset: 'utf8mb4',
  connectTimeout: 30000,
});

const prisma = new PrismaClient({ adapter });

prisma.$connect()
  .then(async () => {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[DB] Prisma conectado ao MySQL!');
  })
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[DB] Erro de conexão Prisma:', message);
    process.exit(1);
  });

export default prisma;
