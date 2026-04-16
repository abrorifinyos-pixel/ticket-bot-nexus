const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue, deleteQueue } = require('../utils/musicManager');
const { ICON_URL } = require('../utils/logManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('إيقاف الموسيقى ومسح القائمة'),

  async execute(interaction, client) {
    const queue = getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: '❌ لا توجد موسيقى تعزف حالياً.', flags: 64 });
    }

    deleteQueue(interaction.guildId);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription('⏹️ تم إيقاف الموسيقى ومسح القائمة بالكامل.')
          .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
      ]
    });
  }
};
