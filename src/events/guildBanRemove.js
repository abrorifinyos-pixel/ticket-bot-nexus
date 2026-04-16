const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'guildBanRemove',
  async execute(ban, client) {
    let executor = null;
    try {
      await new Promise(r => setTimeout(r, 1000));
      const audit = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.target.id === ban.user.id) executor = entry.executor;
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('✅ تم رفع الحظر')
      .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 العضو', value: `${ban.user} — \`${ban.user.tag}\``, inline: true },
        { name: '🪪 الـ ID', value: `\`${ban.user.id}\``, inline: true },
        { name: '👮 الأدمن', value: executor ? `${executor} — \`${executor.tag}\`` : 'غير معروف', inline: true },
        { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
      );
    await sendLog(client, ban.guild.id, 'memberUnban', embed);
  }
};
