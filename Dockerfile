# Usa uma imagem estável do Node.js
FROM node:20

# Cria a pasta do app dentro da máquina virtual
WORKDIR /usr/src/app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código
COPY . .

# Faz o build do TypeScript para JavaScript
RUN npm run build

# Expõe a porta que a sua API usa (3001)
EXPOSE 3001

# Comando para rodar a API
CMD ["node", "dist/server.js"]