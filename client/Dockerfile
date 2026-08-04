FROM node:20-alpine AS builder

WORKDIR /app

COPY client/package*.json ./
RUN npm ci

COPY client/ ./

ARG VITE_API_URL=http://localhost:3001/api
ENV VITE_API_URL=${VITE_API_URL}

RUN echo "VITE_API_URL=$VITE_API_URL"
RUN npm run build

FROM nginx:alpine

RUN apk add --no-cache curl

COPY --from=builder /app/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
