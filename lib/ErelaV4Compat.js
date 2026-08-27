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

function decoratePlayer(player, options) {
  if (player.__erelaCompat) return player;
  player.__erelaCompat = true;
  player.options = {
    guild: player.guildId,
    voiceChannel: player.voiceId,
    textChannel: player.textId,
  };
  player.guild = player.guildId;
  player.voiceChannel = player.voiceId;
  player.textChannel = player.textId;
  player.twentyFourSeven = false;
  player.resumeMessage = null;
  player.pausedMessage = null;
  player.nowPlayingMessage = null;
  player._compatData = player.data;

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
    try {
      return player.shoukaku.stopTrack();
    } catch (_) {
      return player.skip();
    }
  };

  player.setFilters = (filters) => {
    return player.shoukaku.setFilters(filters || {});
  };

  player.search = async (query, requester) => {
    const result = await player.kazagumo.search(query, { requester });
    const tracks = (result.tracks || []).map((track) => decorateTrack(track, requester));
    let loadType = "NO_MATCHES";
    if (result.type === "PLAYLIST") loadType = "PLAYLIST_LOADED";
    else if (tracks.length) loadType = tracks.length === 1 ? "TRACK_LOADED" : "SEARCH_RESULT";
    return {
      loadType,
      tracks,
      playlist: result.playlistName ? { name: result.playlistName, duration: tracks.reduce((n, t) => n + (t.duration || 0), 0) } : undefined,
      playlistInfo: result.playlistName ? { name: result.playlistName } : undefined,
      exception: null,
      raw: result,
    };
  };

  const originalConnect = player.connect.bind(player);
  player.connect = () => {
    const result = originalConnect();
    player.voiceChannel = player.voiceId;
    player.options.voiceChannel = player.voiceId;
    return result;
  };

  const originalDestroy = player.destroy.bind(player);
  player.destroy = async () => originalDestroy();

  return player;
}

class CompatManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.players = new Map();
    this.nodes = new Map();

    const nodes = (options.nodes || []).map((node) => ({
      name: node.identifier || node.name || "Main Node",
      url: `${node.host}:${node.port}`,
      auth: node.password,
      secure: Boolean(node.secure),
    }));

    this.kazagumo = new Kazagumo(
      {
        defaultSearchEngine: "youtube",
        send: options.send,
      },
      new Connectors.DiscordJS(options.client),
      nodes
    );

    for (const node of nodes) {
      const compatNode = {
        options: { identifier: node.name },
        connected: false,
        name: node.name,
      };
      this.nodes.set(node.name, compatNode);
    }

    this.kazagumo.shoukaku.on("ready", (name) => {
      const node = this.nodes.get(name) || { options: { identifier: name } };
      node.connected = true;
      node.options.identifier = name;
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
      decoratePlayer(player, player);
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

    this.kazagumo.on("playerEnd", (player) => {
      this.emit("trackEnd", player);
      const current = player.queue.current;
      if (current) this.emit("queueEnd", player, current);
    });

    this.kazagumo.on("playerException", (player, data) => {
      this.emit("trackError", player, data);
    });

    this.kazagumo.on("playerStuck", (player, data) => {
      this.emit("trackStuck", player, data);
    });

    this.kazagumo.on("playerMoved", (player, state, channels) => {
      const oldChannel = channels?.oldChannelId || null;
      const newChannel = channels?.newChannelId || player.voiceId || null;
      this.emit("playerMove", player, oldChannel, newChannel);
    });

    this.kazagumo.on("playerEmpty", (player) => {
      this.emit("queueEnd", player, player.queue.current);
    });
  }

  async create(options) {
    const player = await this.kazagumo.createPlayer({
      guildId: options.guild,
      textId: options.textChannel,
      voiceId: options.voiceChannel,
      volume: options.volume ?? 100,
      deaf: options.deaf ?? true,
    });
    decoratePlayer(player, options);
    this.players.set(player.guildId, player);
    return player;
  }

  async init() {
    return this;
  }

  updateVoiceState() {
    // Shoukaku's DiscordJS connector listens to Discord voice-state events directly.
  }

  getPlayer(guildId) {
    return this.players.get(guildId);
  }

  destroy(guildId) {
    return this.kazagumo.destroyPlayer(guildId);
  }
}

function install() {
  const Module = require("module");
  const resolved = require.resolve("erela.js");
  const original = require(resolved);
  if (original.__kazagumoV4CompatInstalled) return;

  original.Manager = CompatManager;
  original.__kazagumoV4CompatInstalled = true;
  require.cache[resolved].exports = original;
}

module.exports = { CompatManager, install };
