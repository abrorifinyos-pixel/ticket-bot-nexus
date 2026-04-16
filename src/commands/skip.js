const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue, playSong } = require('../utils/musicManager');
const { ICON_URL } = require('../utils/logManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('تخطي الأغنية الحالية'),

  async execute(interaction, client) {
    const queue = getQueue(interaction.guildId);
    if (!queue || queue.songs.length === 0) {
      return interaction.reply({ content: '❌ لا توجد أغنية تعزف حالياً.', flags: 64 });
    }

    const skipped = queue.songs[0];
    queue.songs.shift();
    playSong(queue, queue.songs[0]);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(`⏭️ تم تخطي **${skipped.title}**\n${queue.songs[0] ? `🎵 التالية: **${queue.songs[0].title}**` : '📭 انتهت القائمة'}`)
          .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
      ]
    });
  }
};
