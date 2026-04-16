const { EmbedBuilder } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'threadUpdate',
  async execute(oldThread, newThread, client) {
    if (!newThread.guild) return;

    const changes = [];
    if (oldThread.name !== newThread.name) changes.push({ name: '📝 الاسم', value: `\`${oldThread.name}\` ← \`${newThread.name}\``, inline: false });
    if (oldThread.archived !== newThread.archived) changes.push({ name: '📦 أرشفة', value: newThread.archived ? 'تم الأرشفة' : 'تم الفك', inline: true });
    if (oldThread.locked !== newThread.locked) changes.push({ name: '🔒 قفل', value: newThread.locked ? 'تم القفل' : 'تم الفتح', inline: true });
    if (!changes.length) return;

    const embed = new EmbedBuilder()
      .setColor(0xfaa81a)
      .setTitle('✏️ تعديل ثريد')
      .addFields(
        { name: '🧵 الثريد', value: `${newThread} — \`${newThread.name}\``, inline: true },
        { name: '🪪 الـ ID', value: `\`${newThread.id}\``, inline: true },
        ...changes,
        { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
      );

    await sendLog(client, newThread.guild.id, 'threadUpdate', embed);
  }
};
