# API do Elo (Express + Socket.IO + Prisma/SQLite). Build a partir da raiz do monorepo:
#   docker build -f server/Dockerfile .
FROM node:22-alpine AS deps
# O query engine do Prisma usa a libssl3, que já vem na imagem base do Alpine
# (por isso o binaryTarget linux-musl-openssl-3.0.x no schema.prisma).
WORKDIR /app
# Só manifests e schema primeiro: a camada do npm ci fica em cache enquanto as dependências não mudarem.
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
COPY server/prisma server/prisma
RUN npm ci --workspace server --omit=dev && npm cache clean --force

FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3333 \
    DATABASE_URL=file:/app/data/elo.db
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/package.json ./
COPY server server
# Pasta do banco SQLite (montada como volume) pertence ao usuário sem privilégios.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
WORKDIR /app/server
EXPOSE 3333
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3333/health || exit 1
CMD ["npm", "run", "start:prod"]
