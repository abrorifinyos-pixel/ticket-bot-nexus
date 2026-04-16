const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/musicManager');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { ICON_URL } = require('../utils/logManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('إيقاف مؤقت للموسيقى'),

  async execute(interaction, client) {
    const queue = getQueue(interaction.guildId);
    if (!queue || !queue.player) {
      return interaction.reply({ content: '❌ لا توجد موسيقى تعزف حالياً.', flags: 64 });
    }

    if (queue.player.state.status === AudioPlayerStatus.Paused) {
      return interaction.reply({ content: '❌ الموسيقى متوقفة مؤقتاً بالفعل.', flags: 64 });
    }

    queue.player.pause();
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfaa81a)
          .setDescription('⏸️ تم إيقاف الموسيقى مؤقتاً.')
          .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
      ]
    });
  }
};
