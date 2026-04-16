const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    let executor = null;
    try {
      await new Promise(r => setTimeout(r, 1000));
      const audit = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.target.id === role.id) executor = entry.executor;
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('🗑️ حذف رتبة')
      .addFields(
        { name: '🎭 اسم الرتبة', value: `\`${role.name}\``, inline: true },
        { name: '🪪 الـ ID', value: `\`${role.id}\``, inline: true },
        { name: '🎨 اللون', value: role.hexColor, inline: true },
        { name: '👮 بواسطة', value: executor ? `${executor} — \`${executor.tag}\`` : 'غير معروف', inline: true },
        { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
      );
    await sendLog(client, role.guild.id, 'roleDelete', embed);
  }
};
