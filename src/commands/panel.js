const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSettings } = require('../utils/guildSettings');
const { sendTicketPanel } = require('../utils/autoSetup');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Send the ticket panel to this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const settings = getSettings(interaction.guildId);

    if (!settings.categories || settings.categories.length === 0) {
      return interaction.reply({
        content: '❌ No categories configured.\nUse `/control-panel` → **Manage Categories** → **Add Category** first.',
        flags: 64
      });
    }

    await interaction.deferReply({ flags: 64 });

    try {
      await sendTicketPanel(interaction.channel, settings, interaction.guildId);
      await interaction.editReply({ content: '✅ Ticket panel sent successfully!' });
    } catch (err) {
      console.error('Panel command error:', err);
      await interaction.editReply({ content: `❌ Error: ${err.message}` });
    }
  }
};
