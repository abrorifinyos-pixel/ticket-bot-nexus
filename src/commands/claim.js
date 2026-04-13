const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTicket, updateTicket, ICON_URL } = require('../utils/ticketManager');
const { getSettings } = require('../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim the current ticket'),

  async execute(interaction, client) {
    const ticket = getTicket(interaction.channelId);
    if (!ticket) return interaction.reply({ content: '❌ This channel is not a ticket.', flags: 64 });

    const settings = getSettings(interaction.guildId);
    const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r));
    if (!isStaff) return interaction.reply({ content: '❌ Only staff can claim tickets.', flags: 64 });

    if (ticket.claimedBy) {
      return interaction.reply({ content: `❌ Already claimed by <@${ticket.claimedBy}>.`, flags: 64 });
    }

    updateTicket(interaction.channelId, { claimedBy: interaction.user.id });

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`🙋 Ticket claimed by ${interaction.user}`)
          .setColor(0x57f287)
          .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
      ]
    });
  }
};
