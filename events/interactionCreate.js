const Controller = require("../util/Controller");
const yt = require("youtube-sr").default;

/**
 * @param {import("../lib/DiscordMusicBot")} client
 * @param {import("discord.js").Interaction} interaction
 */
module.exports = async (client, interaction) => {
  try {
    if (interaction.isCommand()) {
      const command = client.slashCommands.find(
        (x) => x.name === interaction.commandName,
      );
      if (!command || !command.run) {
        return interaction.reply({
          content: "Sorry, that command is not available right now.",
          ephemeral: true,
        }).catch(() => {});
      }
      client.commandsRan++;
      await command.run(client, interaction, interaction.options);
      return;
    }

    if (interaction.isContextMenu()) {
      const command = client.contextCommands.find(
        (x) => x.command.name === interaction.commandName,
      );
      if (!command || !command.run) {
        return interaction.reply({
          content: "Sorry, that command is not available right now.",
          ephemeral: true,
        }).catch(() => {});
      }
      client.commandsRan++;
      await command.run(client, interaction, interaction.options);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith("controller")) {
        await Controller(client, interaction);
      }
      return;
    }

    if (interaction.isAutocomplete()) {
      const url = interaction.options.getString("query") || "";
      if (url === "") return interaction.respond([]).catch(() => {});

      const match = [
        /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/,
        /^(?:spotify:|https:\/\/[a-z]+\.spotify\.com\/(track\/|user\/(.*)\/playlist\/|playlist\/))(.*)$/,
        /^https?:\/\/(?:www\.)?deezer\.com\/[a-z]+\/(track|album|playlist)\/(\d+)$/,
        /^(?:(https?):\/\/)?(?:(?:www|m)\.)?(soundcloud\.com|snd\.sc)\/(.*)$/,
        /(?:https:\/\/music\.apple\.com\/)(?:.+)?(artist|album|music-video|playlist)\/([\w\-\.]+(\/)+[\w\-\.]+|[^&]+)\/([\w\-\.]+(\/)+[\w\-\.]+|[^&]+)/,
      ].some((regex) => regex.test(url));

      if (match) {
        await interaction.respond([{ name: url, value: url }]).catch(() => {});
      }

      if (interaction.commandName === "play") {
        const results = await yt.search(url || "ytsearch", {
          safeSearch: false,
          limit: 25,
        }).catch(() => []);
        const choices = results.map((x) => ({ name: x.title, value: x.url }));
        return interaction.respond(choices.slice(0, 25)).catch(() => {});
      }
    }
  } catch (error) {
    client.error(`Interaction ${interaction.commandName || interaction.type} failed: ${error.stack || error.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Something went wrong while processing that interaction.",
        ephemeral: true,
      }).catch(() => {});
    }
  }
};
