# Mendeleyev Landing — Vue 3 + Telegram leads

## 1. Install
```bash
npm install
```

## 2. Configure Telegram
Open `.env.backend` and replace `PUT_NEW_BOT_TOKEN_HERE` with a NEW token from @BotFather.
Keep `ADMIN_CHAT_ID=1548569662`.

Never put the bot token in `VITE_*` variables or Vue source files.

## 3. Start backend
```bash
npm run server
```
Expected:
`✅ Lead backend: http://localhost:3001`

## 4. Start frontend
In another terminal:
```bash
npm run dev
```

Frontend uses:
`VITE_LEAD_API_URL=http://localhost:3001/api/lead`

## 5. Telegram requirement
The Telegram bot must be started/authorized as needed and the target admin chat must be reachable by the bot. For a private chat, send `/start` to the bot from the admin account before testing.

## 6. Production (Docker Compose)

Tarkibi: `mendeleyev_landing_nginx` (statik frontend + `/api/` proxy, host port `3010`) va
`mendeleyev_landing_api` (Express + Telegram, tashqi portsiz).

```bash
cp .env.backend.example .env.backend   # BOT_TOKEN va ADMIN_CHAT_ID ni to'ldiring
docker compose up -d --build
docker compose ps
docker compose logs -f
```

- Frontend `VITE_LEAD_API_URL` ni build vaqtida oladi (default `/api/lead`, nginx orqali). O'zgartirilsa `--build` kerak.
- Tashqi (host) nginx `127.0.0.1:3010` ga proxy qilib, SSL ni o'zi hal qiladi:
  ```nginx
  location / {
      proxy_pass http://127.0.0.1:3010;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
  }
  ```
- Health: `curl localhost:3010/nginx-health` va `curl localhost:3010/api/health`.
