import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';
import 'dotenv/config';

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST!,
  port: 3306,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  connectionLimit: 10,
});

const prisma = new PrismaClient({ adapter });

prisma.$connect()
  .then(() => console.log('✅ Prisma conectado ao MySQL!'))
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Erro de conexão Prisma:', message);
  });

export default prisma;
