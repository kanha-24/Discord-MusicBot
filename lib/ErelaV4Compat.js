const { EventEmitter } = require("events");
const { Kazagumo } = require("kazagumo");
const { Connectors } = require("shoukaku");

function decorateTrack(track, requester) {
  if (!track) return track;
  if (requester !== undefined && track.requester === undefined) track.requester = requester;
  if (typeof track.displayThumbnail !== "function") {
    track.displayThumbnail = (size = "maxresdefault") => {
      const id = track.identifier;
      if (!id) return track.thumbnail || null;
      return `https://i.ytimg.com/vi/${id}/${size}.jpg`;
    };
  }
  return track;
}

function decoratePlayer(player) {
  if (player.__erelaCompat) return player;
  player.__erelaCompat = true;
  player.options = { guild: player.guildId, voiceChannel: player.voiceId, textChannel: player.textId };
  player.guild = player.guildId;
  player.voiceChannel = player.voiceId;
  player.textChannel = player.textId;
  player.twentyFourSeven = false;
  player.resumeMessage = null;
  player.pausedMessage = null;
  player.nowPlayingMessage = null;

  player.get = (key) => player.data.get(key);
  player.set = (key, value) => {
    player.data.set(key, value);
    if (key === "twentyFourSeven") player.twentyFourSeven = value;
    return player;
  };

  player.setNowplayingMessage = (client, message) => {
    if (player.nowPlayingMessage && !client.isMessageDeleted(player.nowPlayingMessage)) {
      player.nowPlayingMessage.delete().catch(() => {});
      client.markMessageAsDeleted(player.nowPlayingMessage);
    }
    player.nowPlayingMessage = message;
    return message;
  };

  player.setResumeMessage = (client, message) => {
    if (player.resumeMessage && !client.isMessageDeleted(player.resumeMessage)) {
      player.resumeMessage.delete().catch(() => {});
      client.markMessageAsDeleted(player.resumeMessage);
    }
    player.resumeMessage = message;
    return message;
  };

  player.setPausedMessage = (client, message) => {
    if (player.pausedMessage && !client.isMessageDeleted(player.pausedMessage)) {
      player.pausedMessage.delete().catch(() => {});
      client.markMessageAsDeleted(player.pausedMessage);
    }
    player.pausedMessage = message;
    return message;
  };

  player.stop = () => {
    try { return player.shoukaku.stopTrack(); }
    catch (_) { return player.skip(); }
  };

  player.setFilters = (filters) => player.shoukaku.setFilters(filters || {});

  player.search = async (query, requester) => {
    const result = await player.kazagumo.search(query, { requester });
    const tracks = (result.tracks || []).map((track) => decorateTrack(track, requester));
    let loadType = "NO_MATCHES";
    if (result.type === "PLAYLIST") loadType = "PLAYLIST_LOADED";
    else if (tracks.length === 1) loadType = "TRACK_LOADED";
    else if (tracks.length > 1) loadType = "SEARCH_RESULT";
    return {
      loadType,
      tracks,
      playlist: result.playlistName ? { name: result.playlistName, duration: tracks.reduce((n, t) => n + (t.duration || 0), 0) } : undefined,
      playlistInfo: result.playlistName ? { name: result.playlistName } : undefined,
      exception: null,
      raw: result,
    };
  };

  return player;
}

class CompatManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.players = new Map();
    this.nodes = new Map();

    const client = options.client || global.__AERILES_DISCORD_CLIENT;
    if (!client) throw new Error("Discord client is not available for Lavalink v4 initialization.");

    const nodes = (options.nodes || []).map((node) => ({
      name: node.identifier || node.name || "Main Node",
      url: `${node.host}:${node.port}`,
      auth: node.password,
      secure: Boolean(node.secure),
    }));

    this.kazagumo = new Kazagumo(
      { defaultSearchEngine: "youtube", send: options.send },
      new Connectors.DiscordJS(client),
      nodes
    );

    for (const node of nodes) this.nodes.set(node.name, { options: { identifier: node.name }, connected: false });

    this.kazagumo.shoukaku.on("ready", (name) => {
      const node = this.nodes.get(name) || { options: { identifier: name } };
      node.connected = true;
      this.nodes.set(name, node);
      this.emit("nodeConnect", node);
    });
    this.kazagumo.shoukaku.on("error", (name, error) => {
      const node = this.nodes.get(name) || { options: { identifier: name } };
      this.emit("nodeError", node, error);
    });
    this.kazagumo.shoukaku.on("close", (name, code, reason) => {
      const node = this.nodes.get(name) || { options: { identifier: name } };
      node.connected = false;
      this.emit("nodeDisconnect", node, code, reason);
    });

    this.kazagumo.on("playerCreate", (player) => {
      decoratePlayer(player);
      this.players.set(player.guildId, player);
      this.emit("playerCreate", player);
    });
    this.kazagumo.on("playerDestroy", (player) => {
      this.players.delete(player.guildId);
      this.emit("playerDestroy", player);
    });
    this.kazagumo.on("playerStart", (player, track) => {
      decoratePlayer(player);
      this.emit("trackStart", player, decorateTrack(track));
    });
    this.kazagumo.on("playerException", (player, data) => this.emit("trackError", player, data));
    this.kazagumo.on("playerStuck", (player, data) => this.emit("trackStuck", player, data));
    this.kazagumo.on("playerMoved", (player, state, channels) => {
      this.emit("playerMove", player, channels?.oldChannelId || null, channels?.newChannelId || player.voiceId || null);
    });
    this.kazagumo.on("playerEmpty", (player) => this.emit("queueEnd", player, player.queue.current));
  }

  async create(options) {
    const player = await this.kazagumo.createPlayer({
      guildId: options.guild,
      textId: options.textChannel,
      voiceId: options.voiceChannel,
      volume: options.volume ?? 100,
      deaf: options.deaf ?? true,
    });
    decoratePlayer(player);
    this.players.set(player.guildId, player);
    return player;
  }

  async init() { return this; }
  updateVoiceState() {}
  getPlayer(guildId) { return this.players.get(guildId); }
  destroy(guildId) { return this.kazagumo.destroyPlayer(guildId); }
}

function install() {
  const resolved = require.resolve("erela.js");
  const original = require(resolved);
  if (original.__kazagumoV4CompatInstalled) return;
  original.Manager = CompatManager;
  original.__kazagumoV4CompatInstalled = true;
  require.cache[resolved].exports = original;
}

module.exports = { CompatManager, install };
