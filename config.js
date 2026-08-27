const makeNode = (index, fallback = {}) => ({
	identifier: process.env[`LAVALINK_${index}_IDENTIFIER`] || fallback.identifier,
	host: process.env[`LAVALINK_${index}_HOST`] || fallback.host,
	port: Number(process.env[`LAVALINK_${index}_PORT`] || fallback.port || 2333),
	password: process.env[`LAVALINK_${index}_PASSWORD`] || fallback.password || "",
	retryAmount: Number(process.env[`LAVALINK_${index}_RETRY_AMOUNT`] || process.env.LAVALINK_RETRY_AMOUNT || 10),
	retryDelay: Number(process.env[`LAVALINK_${index}_RETRY_DELAY`] || process.env.LAVALINK_RETRY_DELAY || 5000),
	secure: (process.env[`LAVALINK_${index}_SECURE`] ?? String(fallback.secure || false)) === "true",
});

const nodes = [
	makeNode("1", {
		identifier: process.env.LAVALINK_IDENTIFIER || "Main Node",
		host: process.env.LAVALINK_HOST || "",
		port: Number(process.env.LAVALINK_PORT || 2333),
		password: process.env.LAVALINK_PASSWORD || "",
		secure: process.env.LAVALINK_SECURE === "true",
	}),
	makeNode("2"),
	makeNode("3"),
].filter((node) => node.host);

module.exports = {
	helpCmdPerPage: 10,
	lyricsMaxResults: 5,
	adminId: process.env.ADMIN_ID || "",
	token: process.env.TOKEN || "",
	clientId: process.env.CLIENT_ID || "",
	clientSecret: process.env.CLIENT_SECRET || "",
	port: Number(process.env.PORT || 4200),
	prefix: process.env.PREFIX || "!",
	scopes: ["identify", "guilds", "applications.commands"],
	inviteScopes: ["bot", "applications.commands"],
	serverDeafen: true,
	defaultVolume: 100,
	supportServer: "",
	Issues: "https://github.com/kanha-24/Discord-MusicBot/issues",
	permissions: 277083450689,
	disconnectTime: 30000,
	twentyFourSeven: false,
	autoQueue: false,
	autoPause: true,
	autoLeave: false,
	debug: process.env.DEBUG === "true",
	cookieSecret: process.env.COOKIE_SECRET || "",
	website: process.env.WEBSITE || "http://localhost:4200",
	nodes,
	embedColor: process.env.EMBED_COLOR || "#2f3136",
	presence: {
		status: "online",
		activities: [
			{
				name: "Music",
				type: "LISTENING",
			},
		],
	},
	iconURL: process.env.ICON_URL || "https://cdn.darrennathanael.com/icons/spinning_disk.gif",
};
