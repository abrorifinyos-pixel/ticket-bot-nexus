const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'channelUpdate',
  async execute(oldChannel, newChannel, client) {
    if (!newChannel.guild) return;

    let executor = null;
    try {
      await new Promise(r => setTimeout(r, 1000));
      const audit = await newChannel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.target.id === newChannel.id) executor = entry.executor;
    } catch {}

    const changes = [];
    if (oldChannel.name !== newChannel.name) changes.push({ name: '📝 الاسم', value: `\`${oldChannel.name}\` ← \`${newChannel.name}\``, inline: false });
    if (oldChannel.topic !== newChannel.topic) changes.push({ name: '📋 الوصف', value: `\`${oldChannel.topic || 'فارغ'}\` ← \`${newChannel.topic || 'فارغ'}\``, inline: false });
    if (oldChannel.nsfw !== newChannel.nsfw) changes.push({ name: '🔞 NSFW', value: `${oldChannel.nsfw ? 'نعم' : 'لا'} ← ${newChannel.nsfw ? 'نعم' : 'لا'}`, inline: true });
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) changes.push({ name: '⏱️ Slowmode', value: `${oldChannel.rateLimitPerUser}ث ← ${newChannel.rateLimitPerUser}ث`, inline: true });

    // Permission overwrites change
    const oldPerms = oldChannel.permissionOverwrites.cache;
    const newPerms = newChannel.permissionOverwrites.cache;
    let permChanged = oldPerms.size !== newPerms.size;
    if (!permChanged) {
      for (const [id, perm] of newPerms) {
        const old = oldPerms.get(id);
        if (!old || old.allow.bitfield !== perm.allow.bitfield || old.deny.bitfield !== perm.deny.bitfield) { permChanged = true; break; }
      }
    }
    if (permChanged) {
      changes.push({ name: '🔒 الصلاحيات', value: 'تم تحديث صلاحيات الروم', inline: true });
      await logPermUpdate(client, newChannel, executor);
    }

    if (!changes.length) return;

    const embed = new EmbedBuilder()
      .setColor(0xfaa81a)
      .setTitle('✏️ تعديل روم')
      .addFields(
        { name: '📌 الروم', value: `${newChannel} — \`#${newChannel.name}\``, inline: true },
        { name: '🪪 الـ ID', value: `\`${newChannel.id}\``, inline: true },
        { name: '👮 بواسطة', value: executor ? `${executor}` : 'غير معروف', inline: true },
        ...changes.filter(c => c.name !== '🔒 الصلاحيات'),
        { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
      );

    await sendLog(client, newChannel.guild.id, 'channelUpdate', embed);
  }
};

async function logPermUpdate(client, channel, executor) {
  const embed = new EmbedBuilder()
    .setColor(0xf4a261)
    .setTitle('🔒 تحديث صلاحيات روم')
    .addFields(
      { name: '📌 الروم', value: `${channel} — \`#${channel.name}\``, inline: true },
      { name: '🪪 الـ ID', value: `\`${channel.id}\``, inline: true },
      { name: '👮 بواسطة', value: executor ? `${executor} — \`${executor.tag}\`` : 'غير معروف', inline: true },
      { name: '🕒 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
    );
  await sendLog(client, channel.guild.id, 'channelPermUpdate', embed);
}
