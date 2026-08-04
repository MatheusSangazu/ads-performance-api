FROM node:20-alpine AS builder

# Prisma precisa de openssl no Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Contexto é a raiz do projeto (onde está package.json)
COPY package*.json ./
RUN npm ci

COPY server/prisma ./server/prisma/
COPY server/prisma.config.ts ./server/
COPY server/tsconfig.json ./server/
COPY server/src ./server/src

# DATABASE_URL com fallback (placeholder para build - Coolify injeta o real em runtime)
ENV DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"

RUN npx prisma generate --schema=server/prisma/schema.prisma
RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/prisma.config.ts ./server/
COPY --from=builder /app/server/src/generated ./server/src/generated

RUN mkdir -p /app/server/uploads/creatives

VOLUME ["/app/server/uploads/creatives"]

EXPOSE 3001

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

CMD ["sh", "-c", "cd server && npx prisma db push --accept-data-loss && cd .. && node server/dist/app.js"]
