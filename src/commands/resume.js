const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/musicManager');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { ICON_URL } = require('../utils/logManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('استئناف الموسيقى'),

  async execute(interaction, client) {
    const queue = getQueue(interaction.guildId);
    if (!queue || !queue.player) {
      return interaction.reply({ content: '❌ لا توجد موسيقى متوقفة.', flags: 64 });
    }

    if (queue.player.state.status !== AudioPlayerStatus.Paused) {
      return interaction.reply({ content: '❌ الموسيقى تعزف بالفعل.', flags: 64 });
    }

    queue.player.unpause();
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription('▶️ تم استئناف الموسيقى.')
          .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
      ]
    });
  }
};
