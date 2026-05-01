# Estágio 1: Build
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copia o vercel.json equivalente para o nginx se necessário, 
# mas usaremos a config padrão de SPA no nginx.conf interno do container se desejar.
# Por simplicidade, vamos usar o nginx padrão aqui.
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
