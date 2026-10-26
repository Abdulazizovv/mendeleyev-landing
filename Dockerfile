# ── Stage 1: Frontend build (Vite) ───────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_* o'zgaruvchilari BUILD vaqtida bundle ichiga yoziladi.
# Nginx /api/ ni backendga proxy qiladi, shuning uchun nisbiy yo'l yetarli.
ARG VITE_LEAD_API_URL=/api/lead
ENV VITE_LEAD_API_URL=$VITE_LEAD_API_URL

RUN npm run build

# ── Stage 2: Nginx (statik fayllar + /api proxy) ─────────────────────────────
FROM nginx:1.26-alpine AS web
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# ── Stage 3: Lead API (Express + Telegram bot) ───────────────────────────────
FROM node:20-alpine AS api
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js ./

# Statistika fayli shu papkada saqlanadi (docker-compose da volume ulangan).
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 3001

CMD ["node", "server.js"]
