#!/bin/sh
set -e

echo "[STARTUP] Sincronizando schema do banco de dados..."

# db push sincroniza o schema.prisma completo com o banco
# Funciona tanto para banco novo (cria tudo) quanto existente (adiciona o que falta)
npx prisma db push --skip-generate --accept-data-loss 2>&1 || {
  echo "[STARTUP] AVISO: Falha ao sincronizar schema. Continuando mesmo assim..."
}

echo "[STARTUP] Iniciando aplicação..."
exec node server/dist/app.js
