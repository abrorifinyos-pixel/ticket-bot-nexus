const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'guildUpdate',
  async execute(oldGuild, newGuild, client) {
    let executor = null;
    try {
      await new Promise(r => setTimeout(r, 1000));
      const audit = await newGuild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate, limit: 1 });
      const entry = audit.entries.first();
      if (entry) executor = entry.executor;
    } catch {}

    const changes = [];
    if (oldGuild.name !== newGuild.name) changes.push({ name: '📝 الاسم', value: `\`${oldGuild.name}\` ← \`${newGuild.name}\``, inline: false });
    if (oldGuild.iconURL() !== newGuild.iconURL()) changes.push({ name: '🖼️ الصورة', value: 'تم تغيير صورة السيرفر', inline: true });
    if (oldGuild.description !== newGuild.description) changes.push({ name: '📋 الوصف', value: `\`${oldGuild.description || 'فارغ'}\` ← \`${newGuild.description || 'فارغ'}\``, inline: false });
    if (oldGuild.verificationLevel !== newGuild.verificationLevel) changes.push({ name: '🔒 مستوى التحقق', value: `${oldGuild.verificationLevel} ← ${newGuild.verificationLevel}`, inline: true });
    if (!changes.length) return;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🌐 تعديل إعدادات السيرفر')
      .setThumbnail(newGuild.iconURL({ dynamic: true }))
      .addFields(
        { name: '🌐 السيرفر', value: `\`${newGuild.name}\``, inline: true },
        { name: '👮 بواسطة', value: executor ? `${executor} — \`${executor.tag}\`` : 'غير معروف', inline: true },
        ...changes,
        { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
      );

    await sendLog(client, newGuild.id, 'serverUpdate', embed);
  }
};
