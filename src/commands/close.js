const { SlashCommandBuilder } = require('discord.js');
const { getTicket } = require('../utils/ticketManager');
const { getSettings } = require('../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ticket'),

  async execute(interaction, client) {
    const ticket = getTicket(interaction.channelId);
    if (!ticket) return interaction.reply({ content: '❌ This channel is not a ticket.', flags: 64 });
    if (ticket.status === 'closed') return interaction.reply({ content: '❌ Ticket is already closed.', flags: 64 });

    const settings = getSettings(interaction.guildId);
    const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r));
    if (!isStaff && interaction.user.id !== ticket.userId) {
      return interaction.reply({ content: '❌ You do not have permission to close this ticket.', flags: 64 });
    }

    // Trigger close via the button handler logic
    const fakeInteraction = Object.assign(Object.create(Object.getPrototypeOf(interaction)), interaction);
    fakeInteraction.customId = 'ticket_close';

    // Re-use the event handler
    client.emit('interactionCreate', Object.assign(interaction, { customId: 'ticket_close', isButton: () => true, isChatInputCommand: () => false, isStringSelectMenu: () => false, isModalSubmit: () => false }));
  }
};
