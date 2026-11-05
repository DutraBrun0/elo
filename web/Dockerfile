# Front-end do Elo: build estático do Vite servido pelo nginx, que também faz o
# proxy de /api e /socket.io para a API (mesma origem, sem CORS no navegador).
#   docker build -f web/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --workspace web --ignore-scripts
COPY web web
RUN npm run build --workspace web

FROM nginx:1.27-alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY web/nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
