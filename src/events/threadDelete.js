const { EmbedBuilder } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'threadDelete',
  async execute(thread, client) {
    if (!thread.guild) return;

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('🗑️ حذف ثريد')
      .addFields(
        { name: '🧵 اسم الثريد', value: `\`${thread.name}\``, inline: true },
        { name: '🪪 الـ ID', value: `\`${thread.id}\``, inline: true },
        { name: '📌 الروم الرئيسي', value: thread.parent ? `${thread.parent}` : 'غير معروف', inline: true },
        { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
      );

    await sendLog(client, thread.guild.id, 'threadDelete', embed);
  }
};
