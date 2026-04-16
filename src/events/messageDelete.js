const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;
    if (!message.content && !message.attachments.size) return;

    let executor = null;
    try {
      await new Promise(r => setTimeout(r, 1000));
      const audit = await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.target.id === message.author?.id &&
          Date.now() - entry.createdTimestamp < 5000) executor = entry.executor;
    } catch {}

    const fields = [
      { name: '👤 صاحب الرسالة', value: message.author ? `${message.author} — \`${message.author.tag}\`` : 'غير معروف', inline: true },
      { name: '📌 الروم', value: `${message.channel}`, inline: true },
    ];

    if (executor && executor.id !== message.author?.id) {
      fields.push({ name: '🗑️ حُذفت بواسطة', value: `${executor}`, inline: true });
    }

    if (message.content) {
      fields.push({ name: '💬 محتوى الرسالة', value: message.content.slice(0, 1024), inline: false });
    }

    if (message.attachments.size > 0) {
      fields.push({ name: '📎 المرفقات', value: message.attachments.map(a => a.url).join('\n').slice(0, 1024), inline: false });
    }

    fields.push({ name: '🕒 الوقت', value: formatTime(new Date()), inline: false });

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('🗑️ حذف رسالة')
      .addFields(fields);

    await sendLog(client, message.guild.id, 'messageDelete', embed);
  }
};
