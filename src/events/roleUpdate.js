const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'roleUpdate',
  async execute(oldRole, newRole, client) {
    let executor = null;
    try {
      await new Promise(r => setTimeout(r, 1000));
      const audit = await newRole.guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.target.id === newRole.id) executor = entry.executor;
    } catch {}

    const changes = [];
    if (oldRole.name !== newRole.name) changes.push({ name: '📝 الاسم', value: `\`${oldRole.name}\` ← \`${newRole.name}\``, inline: false });
    if (oldRole.hexColor !== newRole.hexColor) changes.push({ name: '🎨 اللون', value: `\`${oldRole.hexColor}\` ← \`${newRole.hexColor}\``, inline: true });
    if (oldRole.hoist !== newRole.hoist) changes.push({ name: '📌 مرفوعة', value: `${oldRole.hoist ? 'نعم' : 'لا'} ← ${newRole.hoist ? 'نعم' : 'لا'}`, inline: true });
    if (oldRole.mentionable !== newRole.mentionable) changes.push({ name: '💬 قابلة للمنشن', value: `${oldRole.mentionable ? 'نعم' : 'لا'} ← ${newRole.mentionable ? 'نعم' : 'لا'}`, inline: true });

    if (!changes.length) return;

    const embed = new EmbedBuilder()
      .setColor(0xfaa81a)
      .setTitle('✏️ تعديل رتبة')
      .addFields(
        { name: '🎭 الرتبة', value: `${newRole} — \`${newRole.name}\``, inline: true },
        { name: '🪪 الـ ID', value: `\`${newRole.id}\``, inline: true },
        { name: '👮 بواسطة', value: executor ? `${executor}` : 'غير معروف', inline: true },
        ...changes,
        { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
      );
    await sendLog(client, newRole.guild.id, 'roleUpdate', embed);
  }
};
