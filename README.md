<h1 align="center"><img src="./assets/logo.gif" width="30px"> Discord Music Bot <img src="./assets/logo.gif" width="30px"></h1>

# Kanha v6 modernization

This fork continues the archived Discord Music Bot as a modernized v6 codebase.

## Phase 1 status

- Node.js 22 is the supported runtime for the bot.
- Runtime secrets and deployment-specific settings are read from environment variables.
- Use `.env.example` as the configuration template.
- The bot validates required runtime configuration before connecting to Discord.
- Lavalink remains required for music playback in Phase 1.

## Prerequisites

- Node.js 22
- A working Lavalink server
- A Discord application and bot token
- Discord OAuth credentials if the dashboard is enabled

## Configuration

Copy `.env.example` to `.env` and fill in the values.

Required values:

- `TOKEN`
- `CLIENT_ID`
- `CLIENT_SECRET`
- `COOKIE_SECRET`
- `LAVALINK_HOST`
- `LAVALINK_PASSWORD`

Optional values include `LAVALINK_PORT`, `LAVALINK_SECURE`, `PORT`, `WEBSITE`, `ADMIN_ID`, and `EMBED_COLOR`.

## Install and run

```sh
npm install
npm run validate-env
npm run deploy
npm start
```

Slash commands only need to be deployed when command definitions change, so `npm run deploy` should not be part of the container image build.

## Docker

The Docker image targets Node.js 22. Provide the environment variables at runtime rather than baking credentials into the image.

```sh
docker build -t discord-musicbot .
docker run --env-file .env discord-musicbot
```

## Project direction

Phase 1 keeps the existing Discord.js/Erela playback API intact while establishing a current runtime and safer configuration boundary. The Discord.js/Lavalink client upgrade will be handled separately so playback regressions are isolated and testable.

## License

Apache-2.0
