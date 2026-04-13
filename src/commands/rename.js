const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicket } = require('../utils/ticketManager');
const { getSettings } = require('../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename the current ticket channel')
    .addStringOption(opt =>
      opt.setName('name').setDescription('New ticket name').setRequired(true)
    ),

  async execute(interaction, client) {
    const ticket = getTicket(interaction.channelId);
    if (!ticket) return interaction.reply({ content: '❌ This channel is not a ticket.', flags: 64 });

    const settings = getSettings(interaction.guildId);
    const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r));
    if (!isStaff) return interaction.reply({ content: '❌ Only staff can rename tickets.', flags: 64 });

    const newName = interaction.options.getString('name').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    await interaction.channel.setName(newName);
    await interaction.reply({ content: `✅ Ticket renamed to **${newName}**` });
  }
};
