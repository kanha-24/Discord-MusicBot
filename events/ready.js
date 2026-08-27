const DiscordMusicBot = require("../lib/DiscordMusicBot");

/**
 * Register the loaded commands with Discord and initialize Lavalink.
 * @param {DiscordMusicBot} client
 */
module.exports = async (client) => {
  try {
    const commands = [
      ...client.slashCommands.map((command) => command.toJSON()),
      ...client.contextCommands.map((command) => command.command.toJSON()),
    ];

    await client.api.applications(client.user.id).commands.put({ data: commands });
    client.log(`Registered ${commands.length} application commands.`);
  } catch (error) {
    client.error(`Failed to register application commands: ${error.message}`);
  }

  try {
    client.manager.init(client.user.id);
  } catch (error) {
    client.error(`Failed to initialize Lavalink manager: ${error.message}`);
  }

  client.user.setPresence(client.config.presence);
  client.log("Successfully Logged in as " + client.user.tag);
};
