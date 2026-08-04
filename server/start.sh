#!/bin/sh
set -e

echo "[STARTUP] Sincronizando schema do banco de dados..."

# Roda do diretório server/ onde está o prisma.config.ts e schema.prisma
cd /app/server

echo "[STARTUP] DATABASE_URL: ${DATABASE_URL:+configurada}"
echo "[STARTUP] DB_HOST: ${DB_HOST:+configurada}"

# db push sincroniza o schema.prisma completo com o banco
npx prisma db push --accept-data-loss 2>&1 || {
  echo "[STARTUP] AVISO: Falha ao sincronizar schema. Continuando mesmo assim..."
}

cd /app
echo "[STARTUP] Iniciando aplicação..."
exec node server/dist/app.js
