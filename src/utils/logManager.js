const { EmbedBuilder } = require('discord.js');
const { getLogChannel } = require('./guildSettings');

const ICON_URL = 'https://i.imgur.com/5sRuCkB.png';

async function sendLog(client, guildId, logType, embed) {
  const channelId = getLogChannel(guildId, logType);
  if (!channelId) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  embed.setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL }).setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
}

function formatTime(date) {
  return `<t:${Math.floor((date || Date.now()) / 1000)}:F>`;
}

function buildEmbed(color, title, fields) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .addFields(fields.filter(f => f && f.value));
}

module.exports = { sendLog, formatTime, buildEmbed, ICON_URL };
