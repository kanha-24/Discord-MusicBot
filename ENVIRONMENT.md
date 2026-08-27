# Environment setup

Luniq/Discord-MusicBot v6 reads secrets and deployment-specific values from environment variables.

## Required

- `TOKEN` — Discord bot token
- `CLIENT_ID` — Discord application/client ID
- `CLIENT_SECRET` — Discord OAuth client secret
- `COOKIE_SECRET` — long random secret used to sign dashboard sessions
- `LAVALINK_HOST` — Lavalink hostname
- `LAVALINK_PORT` — Lavalink port
- `LAVALINK_PASSWORD` — Lavalink password

## Optional

- `LAVALINK_SECURE=true` when the Lavalink connection uses TLS
- `WEBSITE` — public dashboard URL; defaults to `http://localhost:4200`
- `PORT` — dashboard/API port; defaults to `4200`
- `ADMIN_ID` — Discord user ID for the bot administrator

Do not commit `.env` or real credentials. Use `.env.example` as the template.
