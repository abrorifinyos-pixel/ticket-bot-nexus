const { SlashCommandBuilder } = require('discord.js');
const { getTicket } = require('../utils/ticketManager');
const { getSettings } = require('../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a user from the current ticket')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to remove').setRequired(true)
    ),

  async execute(interaction, client) {
    const ticket = getTicket(interaction.channelId);
    if (!ticket) return interaction.reply({ content: '❌ This channel is not a ticket.', flags: 64 });

    const settings = getSettings(interaction.guildId);
    const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r));
    if (!isStaff) return interaction.reply({ content: '❌ Only staff can remove users from tickets.', flags: 64 });

    const member = interaction.options.getMember('user');
    if (!member) return interaction.reply({ content: '❌ User not found in this server.', flags: 64 });

    if (member.id === ticket.userId) {
      return interaction.reply({ content: '❌ Cannot remove the ticket owner.', flags: 64 });
    }

    await interaction.channel.permissionOverwrites.delete(member.id);
    await interaction.reply({ content: `✅ ${member} has been removed from the ticket.` });
  }
};
