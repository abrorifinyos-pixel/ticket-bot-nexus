const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    // Timeout
    if (!oldMember.communicationDisabledUntilTimestamp && newMember.communicationDisabledUntilTimestamp) {
      let executor = null;
      let reason = 'لا يوجد سبب';
      try {
        await new Promise(r => setTimeout(r, 1000));
        const audit = await newMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 1 });
        const entry = audit.entries.first();
        if (entry && entry.target.id === newMember.id) {
          executor = entry.executor;
          reason = entry.reason || reason;
        }
      } catch {}

      const until = newMember.communicationDisabledUntilTimestamp;
      const embed = new EmbedBuilder()
        .setColor(0xfaa81a)
        .setTitle('⏰ تم إعطاء مهلة لعضو (Timeout)')
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '👤 العضو', value: `${newMember.user} — \`${newMember.user.tag}\``, inline: true },
          { name: '🪪 الـ ID', value: `\`${newMember.user.id}\``, inline: true },
          { name: '👮 الأدمن', value: executor ? `${executor} — \`${executor.tag}\`` : 'غير معروف', inline: true },
          { name: '⏳ المهلة حتى', value: `<t:${Math.floor(until / 1000)}:F>`, inline: true },
          { name: '📋 السبب', value: reason, inline: false },
          { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
        );
      await sendLog(client, newMember.guild.id, 'memberTimeout', embed);
    }

    // Nickname change
    if (oldMember.nickname !== newMember.nickname) {
      let executor = null;
      try {
        await new Promise(r => setTimeout(r, 1000));
        const audit = await newMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 1 });
        const entry = audit.entries.first();
        if (entry && entry.target.id === newMember.id) executor = entry.executor;
      } catch {}

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('✏️ تغيير اللقب')
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '👤 العضو', value: `${newMember.user} — \`${newMember.user.tag}\``, inline: true },
          { name: '🪪 الـ ID', value: `\`${newMember.user.id}\``, inline: true },
          { name: '📝 قبل', value: oldMember.nickname || 'بدون لقب', inline: true },
          { name: '📝 بعد', value: newMember.nickname || 'بدون لقب', inline: true },
          { name: '👮 بواسطة', value: executor ? `${executor}` : 'غير معروف', inline: true },
          { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
        );
      await sendLog(client, newMember.guild.id, 'memberNickname', embed);
    }

    // Role changes
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);

    if (addedRoles.size > 0) {
      let executor = null;
      try {
        await new Promise(r => setTimeout(r, 1000));
        const audit = await newMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 1 });
        const entry = audit.entries.first();
        if (entry && entry.target.id === newMember.id) executor = entry.executor;
      } catch {}

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('➕ إعطاء رتبة لعضو')
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '👤 العضو', value: `${newMember.user} — \`${newMember.user.tag}\``, inline: true },
          { name: '🪪 الـ ID', value: `\`${newMember.user.id}\``, inline: true },
          { name: '🎭 الرتب المضافة', value: addedRoles.map(r => `${r}`).join(', '), inline: false },
          { name: '👮 بواسطة', value: executor ? `${executor}` : 'غير معروف', inline: true },
          { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
        );
      await sendLog(client, newMember.guild.id, 'memberRoleAdd', embed);
    }

    if (removedRoles.size > 0) {
      let executor = null;
      try {
        await new Promise(r => setTimeout(r, 1000));
        const audit = await newMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 1 });
        const entry = audit.entries.first();
        if (entry && entry.target.id === newMember.id) executor = entry.executor;
      } catch {}

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('➖ إزالة رتبة من عضو')
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '👤 العضو', value: `${newMember.user} — \`${newMember.user.tag}\``, inline: true },
          { name: '🪪 الـ ID', value: `\`${newMember.user.id}\``, inline: true },
          { name: '🎭 الرتب المزالة', value: removedRoles.map(r => `${r}`).join(', '), inline: false },
          { name: '👮 بواسطة', value: executor ? `${executor}` : 'غير معروف', inline: true },
          { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
        );
      await sendLog(client, newMember.guild.id, 'memberRoleRemove', embed);
    }
  }
};
