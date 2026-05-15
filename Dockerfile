FROM node:20-alpine AS base

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
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

ENV NODE_ENV=production
EXPOSE 3001

RUN mkdir -p /app/server/uploads/creatives

CMD ["node", "server/dist/app.js"]
