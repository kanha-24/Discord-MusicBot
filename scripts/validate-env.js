require("dotenv").config();

const required = ["TOKEN", "CLIENT_ID", "CLIENT_SECRET", "COOKIE_SECRET", "LAVALINK_HOST", "LAVALINK_PASSWORD"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const port = Number(process.env.LAVALINK_PORT || 2333);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("LAVALINK_PORT must be a valid TCP port.");
  process.exit(1);
}

console.log("Environment configuration looks valid.");
