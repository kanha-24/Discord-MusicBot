const { Kazagumo, Plugins } = require("kazagumo");
const { Connectors } = require("shoukaku");

/**
 * Creates the Lavalink v4 music manager.
 *
 * This adapter intentionally keeps the existing Discord.js 13 client separate
 * from the music implementation so the Discord.js migration can happen later.
 */
function createLavalinkManager(client, config) {
  const manager = new Kazagumo(
    {
      defaultSearchEngine: "youtube",
      plugins: [],
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      },
    },
    new Connectors.DiscordJS(client),
    config.nodes.map((node) => ({
      name: node.identifier,
      url: `${node.host}:${node.port}`,
      auth: node.password,
      secure: Boolean(node.secure),
    }))
  );

  manager.shoukaku.on("ready", (name) => {
    client.log(`Node: ${name} | Lavalink v4 node is connected.`);
  });
  manager.shoukaku.on("error", (name, error) => {
    client.warn(`Node: ${name} | Lavalink error: ${error.message}`);
  });
  manager.shoukaku.on("close", (name, code, reason) => {
    client.warn(`Node: ${name} | Lavalink disconnected (${code}): ${reason || "unknown reason"}`);
  });
  manager.shoukaku.on("debug", (name, info) => {
    if (config.debug) client.warn(`Node: ${name} | ${info}`);
  });

  manager.on("playerStart", (player, track) => {
    client.log(`Player: ${player.guildId} | Track started: ${track.title}`);
  });
  manager.on("playerEnd", (player) => {
    client.log(`Player: ${player.guildId} | Track ended.`);
  });
  manager.on("playerException", (player, track, error) => {
    client.warn(`Player: ${player.guildId} | Track error: ${error.message}`);
  });
  manager.on("playerStuck", (player, track, thresholdMs) => {
    client.warn(`Player: ${player.guildId} | Track stuck after ${thresholdMs}ms.`);
  });

  return manager;
}

module.exports = { createLavalinkManager };
