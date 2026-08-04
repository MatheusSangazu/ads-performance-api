FROM node:20-alpine AS base

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=development

COPY package*.json ./
COPY server/prisma ./server/prisma/
COPY server/prisma.config.ts ./server/

RUN npm install

COPY server/ ./server/

RUN npx prisma generate --schema=server/prisma/schema.prisma

RUN npm run build

FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/server/dist ./server/dist
COPY --from=base /app/server/prisma ./server/prisma
COPY --from=base /app/server/prisma.config.ts ./server/
COPY --from=base /app/server/src/generated ./server/src/generated
COPY server/start.sh ./server/start.sh

RUN chmod +x server/start.sh

RUN mkdir -p /app/server/uploads/creatives

VOLUME ["/app/server/uploads/creatives"]

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

CMD ["sh", "server/start.sh"]
