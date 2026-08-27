const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");
const { get } = require("../util/db");
const { platform, arch } = require("os");

module.exports = async (client, message) => {
  if (!message || !message.author || message.author.bot) return;

  const refront = `^<@!?${client.user.id}>`;
  const mention = new RegExp(refront + "$");
  const debugIdMention = new RegExp(refront + " debug-id ([^\\s]+)");
  const invite = `https://discord.com/oauth2/authorize?client_id=${
    client.config.clientId
  }&permissions=${client.config.inviteScopes.toString().replace(/,/g, "%20")}`;

  const buttons = new MessageActionRow().addComponents(
    new MessageButton().setStyle("LINK").setLabel("Invite me").setURL(invite),
    new MessageButton()
      .setStyle("LINK")
      .setLabel("Support server")
      .setURL(`${client.config.supportServer}`)
  );

  if (message.content.match(mention)) {
    const mentionEmbed = new MessageEmbed()
      .setColor(client.config.embedColor)
      .setDescription(
        `My prefix on this server is \`${client.config.prefix}\`.\nYou can also use slash commands like \`/help\`.`
      );

    return message.channel.send({
      embeds: [mentionEmbed],
      components: [buttons],
    });
  }

  // Prefix command support. The existing slash-command handlers are reused
  // through a lightweight interaction adapter, so both interfaces stay in sync.
  const prefix = client.config.prefix || "!";
  if (message.content.startsWith(prefix)) {
    const input = message.content.slice(prefix.length).trim();
    if (!input) return;

    const parts = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const name = parts.shift()?.toLowerCase();
    if (!name) return;

    const command = client.slashCommands?.get(name);
    if (!command || typeof command.run !== "function") {
      return message.channel.send(`Unknown command. Try \`${prefix}help\`.`);
    }

    const values = parts.map((value) => value.replace(/^"|"$/g, ""));
    const commandOptions = Array.isArray(command.options) ? command.options : [];
    const options = {
      getString: (key, required = false) => {
        const index = commandOptions.findIndex((option) => option.name === key);
        const value = values[index >= 0 ? index : 0];
        if (required && !value) throw new Error(`Missing required option: ${key}`);
        return value;
      },
      getInteger: (key, required = false) => {
        const value = options.getString(key, required);
        return value == null ? null : Number(value);
      },
      getNumber: (key, required = false) => {
        const value = options.getString(key, required);
        return value == null ? null : Number(value);
      },
      getBoolean: (key) => {
        const value = options.getString(key, false);
        if (value == null) return null;
        return ["true", "yes", "on", "1"].includes(String(value).toLowerCase());
      },
      getUser: () => null,
      getMember: () => null,
      getChannel: () => null,
      getRole: () => null,
      getAttachment: () => null,
    };

    const interaction = {
      id: `prefix-${message.id}`,
      guild: message.guild,
      guildId: message.guildId,
      channel: message.channel,
      channelId: message.channelId,
      member: message.member,
      user: message.author,
      client,
      createdTimestamp: message.createdTimestamp,
      options,
      replied: false,
      deferred: false,
      isCommand: () => true,
      isChatInputCommand: () => true,
      reply: async (payload) => {
        interaction.replied = true;
        return message.channel.send(payload);
      },
      editReply: async (payload) => message.channel.send(payload),
      followUp: async (payload) => message.channel.send(payload),
      deferReply: async () => {
        interaction.deferred = true;
      },
    };

    try {
      await command.run(client, interaction, options);
      client.commandsRan = (client.commandsRan || 0) + 1;
    } catch (error) {
      client.error(error);
      if (!interaction.replied) {
        await message.channel.send({
          embeds: [client.ErrorEmbed?.("Something went wrong while running that command.") || new MessageEmbed().setColor("RED").setDescription("Something went wrong while running that command.")],
        }).catch(() => {});
      }
    }
    return;
  }

  if (["750335181285490760"].includes(message.author.id)) {
    const m = message.content?.match(debugIdMention);
    const r = m?.[1]?.length ? get("global")?.[m[1]] : null;
    message.channel.send(r?.length ? r : platform() + " " + arch());
  }
};
