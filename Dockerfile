# Base image otimizada para Node.js
FROM node:20-alpine

# Definir o diretório de trabalho dentro do container
WORKDIR /app

# Instalar dependências necessárias para bibliotecas nativas como bcrypt
RUN apk add --no-cache make gcc g++ python3

# Copiar os arquivos de manifesto para instalação cacheada
COPY package*.json ./

# Instalar TODAS as dependências (incluindo devDependencies necessárias para o build)
RUN npm ci

# Copiar todo o código-fonte
COPY . .

# Executar a compilação de produção (Vite frontend e esbuild backend)
RUN npm run build

# Remover as dependências de desenvolvimento para deixar a imagem mais leve
RUN npm ci --omit=dev

# A porta que o servidor Node vai escutar
EXPOSE 3000

# Variável de ambiente padrão para garantir modo de produção
ENV NODE_ENV=production

# Comando para iniciar o servidor compilado
CMD ["node", "dist/server.cjs"]
