import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_DIALECT: z.string().optional(),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ADMIN_EMAIL: z.string().default('admin@growthads.com'),
  ADMIN_PASSWORD: z.string().default('changeme123'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[ENV] Variáveis de ambiente inválidas:');
  parsed.error.issues.forEach((issue) => {
    console.error(`   → ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
