const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    let executor = null;
    let reason = ban.reason || 'لا يوجد سبب';
    try {
      await new Promise(r => setTimeout(r, 1000));
      const audit = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.target.id === ban.user.id) {
        executor = entry.executor;
        reason = entry.reason || reason;
      }
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(0xf04747)
      .setTitle('🔨 تم حظر عضو')
      .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 العضو المحظور', value: `${ban.user} — \`${ban.user.tag}\``, inline: true },
        { name: '🪪 الـ ID', value: `\`${ban.user.id}\``, inline: true },
        { name: '👮 الأدمن', value: executor ? `${executor} — \`${executor.tag}\`` : 'غير معروف', inline: true },
        { name: '📋 السبب', value: reason, inline: false },
        { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
      );
    await sendLog(client, ban.guild.id, 'memberBan', embed);
  }
};
