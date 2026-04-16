const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/musicManager');
const { ICON_URL } = require('../utils/logManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('تفعيل أو تعطيل تكرار الأغنية الحالية'),

  async execute(interaction, client) {
    const queue = getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: '❌ لا توجد موسيقى تعزف حالياً.', flags: 64 });
    }

    queue.loop = !queue.loop;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(queue.loop ? 0x57f287 : 0xed4245)
          .setDescription(`🔁 التكرار: **${queue.loop ? 'مفعّل' : 'معطّل'}**`)
          .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
      ]
    });
  }
};
