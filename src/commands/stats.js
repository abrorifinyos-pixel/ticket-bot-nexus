const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { readJSON } = require('../utils/database');
const { ICON_URL } = require('../utils/ticketManager');
const { getSettings } = require('../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show ticket statistics for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });

    const tickets = readJSON('tickets');
    const guildTickets = Object.values(tickets).filter(t => t.guildId === interaction.guildId);

    const total = guildTickets.length;
    const open = guildTickets.filter(t => t.status === 'open').length;
    const closed = guildTickets.filter(t => t.status === 'closed').length;
    const rated = guildTickets.filter(t => t.rating).length;

    const avgRating = rated
      ? (guildTickets.filter(t => t.rating).reduce((a, t) => a + t.rating, 0) / rated).toFixed(1)
      : 'N/A';

    const settings = getSettings(interaction.guildId);
    const counter = settings.ticketCounter || total;

    // Category breakdown
    const catMap = {};
    for (const t of guildTickets) {
      catMap[t.categoryLabel || 'Unknown'] = (catMap[t.categoryLabel || 'Unknown'] || 0) + 1;
    }
    const catText = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `• ${k}: **${v}**`)
      .join('\n') || 'No data';

    const embed = new EmbedBuilder()
      .setTitle('📊 Ticket Statistics')
      .addFields(
        { name: '🎫 Total Tickets', value: `**${counter}**`, inline: true },
        { name: '🟢 Open', value: `**${open}**`, inline: true },
        { name: '🔒 Closed', value: `**${closed}**`, inline: true },
        { name: '⭐ Avg Rating', value: `**${avgRating}**`, inline: true },
        { name: '📝 Rated', value: `**${rated}**`, inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        { name: '📂 By Category', value: catText },
      )
      .setColor(0x5865f2)
      .setThumbnail(ICON_URL)
      .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
