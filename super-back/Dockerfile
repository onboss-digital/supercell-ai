# Use a imagem oficial do Node.js
FROM node:20-slim

# Instala openssl para o Prisma
RUN apt-get update -y && apt-get install -y openssl

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências
RUN npm install

# Gera o Prisma Client
RUN npx prisma generate

# Copia o restante do código
COPY . .

# Expõe a porta que o app vai rodar
EXPOSE 3005

# Comando para iniciar o servidor
CMD ["npm", "start"]
