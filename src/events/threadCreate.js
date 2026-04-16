const { EmbedBuilder } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'threadCreate',
  async execute(thread, newlyCreated, client) {
    if (!thread.guild || !newlyCreated) return;

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🧵 إنشاء ثريد جديد')
      .addFields(
        { name: '🧵 الثريد', value: `${thread} — \`${thread.name}\``, inline: true },
        { name: '🪪 الـ ID', value: `\`${thread.id}\``, inline: true },
        { name: '📌 الروم الرئيسي', value: thread.parent ? `${thread.parent}` : 'غير معروف', inline: true },
        { name: '👤 أنشأه', value: thread.ownerId ? `<@${thread.ownerId}>` : 'غير معروف', inline: true },
        { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
      );

    await sendLog(client, thread.guild.id, 'threadCreate', embed);
  }
};
