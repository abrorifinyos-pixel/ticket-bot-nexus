const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/musicManager');
const { ICON_URL } = require('../utils/logManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('عرض قائمة الأغاني الحالية'),

  async execute(interaction, client) {
    const queue = getQueue(interaction.guildId);
    if (!queue || queue.songs.length === 0) {
      return interaction.reply({ content: '❌ القائمة فارغة.', flags: 64 });
    }

    const current = queue.songs[0];
    const upcoming = queue.songs.slice(1, 11);

    const desc = upcoming.length > 0
      ? upcoming.map((s, i) => `**${i + 1}.** [${s.title}](${s.url}) — ${s.duration || '?'}`).join('\n')
      : 'لا توجد أغاني قادمة.';

    const embed = new EmbedBuilder()
      .setTitle('🎵 قائمة الأغاني')
      .setColor(0x5865f2)
      .addFields(
        { name: '▶️ يتم التشغيل الآن', value: `[${current.title}](${current.url}) — ${current.duration || '?'}`, inline: false },
        { name: `📋 القادمة (${upcoming.length} من ${queue.songs.length - 1})`, value: desc, inline: false },
        { name: '🔁 التكرار', value: queue.loop ? 'مفعّل' : 'معطّل', inline: true },
        { name: '🎵 إجمالي الأغاني', value: `${queue.songs.length}`, inline: true },
      )
      .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL });

    await interaction.reply({ embeds: [embed] });
  }
};
