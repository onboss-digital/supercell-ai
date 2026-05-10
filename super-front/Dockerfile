# Estágio 1: Build
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Recebe a URL da API como build argument (passado pelo docker-compose)
ARG VITE_API_URL=https://supercellia.com
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Estágio 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Configuração de SPA para o Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
