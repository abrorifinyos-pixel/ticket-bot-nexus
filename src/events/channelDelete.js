const { EmbedBuilder, AuditLogEvent, ChannelType } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

const CHANNEL_TYPES = {
  [ChannelType.GuildText]: 'نصي',
  [ChannelType.GuildVoice]: 'صوتي',
  [ChannelType.GuildCategory]: 'كاتاغوري',
  [ChannelType.GuildAnnouncement]: 'إعلانات',
  [ChannelType.GuildForum]: 'فوروم',
  [ChannelType.GuildStageVoice]: 'ستيج',
};

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    if (!channel.guild) return;

    let executor = null;
    try {
      await new Promise(r => setTimeout(r, 1000));
      const audit = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.target.id === channel.id) executor = entry.executor;
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('🗑️ حذف روم')
      .addFields(
        { name: '📌 اسم الروم', value: `\`#${channel.name}\``, inline: true },
        { name: '🪪 الـ ID', value: `\`${channel.id}\``, inline: true },
        { name: '📂 النوع', value: CHANNEL_TYPES[channel.type] || 'غير معروف', inline: true },
        { name: '📁 الكاتاغوري', value: channel.parent ? `\`${channel.parent.name}\`` : 'بدون كاتاغوري', inline: true },
        { name: '👮 بواسطة', value: executor ? `${executor} — \`${executor.tag}\`` : 'غير معروف', inline: true },
        { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
      );

    await sendLog(client, channel.guild.id, 'channelDelete', embed);
  }
};
