const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'messageDeleteBulk',
  async execute(messages, channel, client) {
    if (!channel.guild) return;

    let executor = null;
    try {
      await new Promise(r => setTimeout(r, 1000));
      const audit = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.MessageBulkDelete, limit: 1 });
      const entry = audit.entries.first();
      if (entry && Date.now() - entry.createdTimestamp < 5000) executor = entry.executor;
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('🗑️ حذف رسائل متعددة (Bulk Delete)')
      .addFields(
        { name: '📌 الروم', value: `${channel}`, inline: true },
        { name: '📊 عدد الرسائل المحذوفة', value: `\`${messages.size}\``, inline: true },
        { name: '👮 بواسطة', value: executor ? `${executor}` : 'غير معروف', inline: true },
        { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
      );

    await sendLog(client, channel.guild.id, 'messageDeleteBulk', embed);
  }
};
