const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicket } = require('../utils/ticketManager');
const { getSettings } = require('../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a user to the current ticket')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to add').setRequired(true)
    ),

  async execute(interaction, client) {
    const ticket = getTicket(interaction.channelId);
    if (!ticket) return interaction.reply({ content: '❌ This channel is not a ticket.', flags: 64 });

    const settings = getSettings(interaction.guildId);
    const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r));
    if (!isStaff && interaction.user.id !== ticket.userId) {
      return interaction.reply({ content: '❌ Only staff or the ticket owner can add users.', flags: 64 });
    }

    const member = interaction.options.getMember('user');
    if (!member) return interaction.reply({ content: '❌ User not found in this server.', flags: 64 });

    await interaction.channel.permissionOverwrites.edit(member.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true
    });

    await interaction.reply({ content: `✅ ${member} has been added to the ticket.` });
  }
};
