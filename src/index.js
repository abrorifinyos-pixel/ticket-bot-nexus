require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const { connectDB } = require('./utils/database');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

async function main() {
  await connectDB();
  await loadCommands(client);
  await loadEvents(client);

  client.once('clientReady', () => {
    console.log(`✅ Nexus Script اتصل بنجاح: ${client.user.tag}`);

    client.user.setPresence({
      activities: [{ name: 'Bot Logs | Bot Music', type: ActivityType.Watching }],
      status: 'online',
    });

    require('./utils/autoSetup')(client);
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);
}

main().catch(console.error);
