require("dotenv").config();

const required = ["TOKEN", "CLIENT_ID", "CLIENT_SECRET", "COOKIE_SECRET", "LAVALINK_HOST", "LAVALINK_PASSWORD"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  console.error("Copy .env.example to .env and fill in the values before starting the bot.");
  process.exit(1);
}

const lavalinkPort = Number(process.env.LAVALINK_PORT || 2333);
if (!Number.isInteger(lavalinkPort) || lavalinkPort < 1 || lavalinkPort > 65535) {
  console.error("LAVALINK_PORT must be a valid TCP port.");
  process.exit(1);
}

// Install the Lavalink v4 compatibility layer before the legacy music bot
// module loads its existing Erela.js imports.
require("./lib/ErelaV4Compat").install();

const DiscordMusicBot = require("./lib/DiscordMusicBot");
const { exec } = require("child_process");

if (process.env.REPL_ID) {
  console.log("Replit system detected, initiating special unhandledRejection event listener.");
  process.on("unhandledRejection", (reason, promise) => {
    promise.catch((err) => {
      if (err.status === 429) {
        console.log("Something went wrong whilst trying to connect to Discord Gateway, resetting...");
        exec("kill 1");
      }
    });
  });
}

const client = new DiscordMusicBot();
global.__AERILES_DISCORD_CLIENT = client;
console.log("Starting Discord Music Bot with Lavalink v4 compatibility...");

const getClient = () => client;

module.exports = { getClient };
