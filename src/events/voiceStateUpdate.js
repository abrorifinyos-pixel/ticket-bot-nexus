const { EmbedBuilder } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;
    const guildId = (newState.guild || oldState.guild).id;

    // Join voice
    if (!oldState.channelId && newState.channelId) {
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('🎙️ انضمام لقناة صوتية')
        .addFields(
          { name: '👤 العضو', value: `${member.user} — \`${member.user.tag}\``, inline: true },
          { name: '🔊 القناة', value: `\`${newState.channel?.name || 'غير معروف'}\``, inline: true },
          { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
        );
      return sendLog(client, guildId, 'voiceJoin', embed);
    }

    // Leave voice
    if (oldState.channelId && !newState.channelId) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('🚪 مغادرة قناة صوتية')
        .addFields(
          { name: '👤 العضو', value: `${member.user} — \`${member.user.tag}\``, inline: true },
          { name: '🔊 القناة', value: `\`${oldState.channel?.name || 'غير معروف'}\``, inline: true },
          { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
        );
      return sendLog(client, guildId, 'voiceLeave', embed);
    }

    // Move between channels
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('↔️ نقل في الصوت')
        .addFields(
          { name: '👤 العضو', value: `${member.user} — \`${member.user.tag}\``, inline: true },
          { name: '🔊 من', value: `\`${oldState.channel?.name || 'غير معروف'}\``, inline: true },
          { name: '🔊 إلى', value: `\`${newState.channel?.name || 'غير معروف'}\``, inline: true },
          { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
        );
      return sendLog(client, guildId, 'voiceMove', embed);
    }

    // Mute/unmute
    if (oldState.selfMute !== newState.selfMute || oldState.serverMute !== newState.serverMute) {
      const isMuted = newState.selfMute || newState.serverMute;
      const embed = new EmbedBuilder()
        .setColor(isMuted ? 0xfaa81a : 0x57f287)
        .setTitle(isMuted ? '🔇 كتم صوت عضو' : '🔈 فك كتم صوت عضو')
        .addFields(
          { name: '👤 العضو', value: `${member.user} — \`${member.user.tag}\``, inline: true },
          { name: '🔊 القناة', value: `\`${newState.channel?.name || 'غير معروف'}\``, inline: true },
          { name: '📋 النوع', value: newState.serverMute ? 'كتم من الإدارة' : 'كتم ذاتي', inline: true },
          { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
        );
      return sendLog(client, guildId, 'voiceMute', embed);
    }

    // Deafen/undeafen
    if (oldState.selfDeaf !== newState.selfDeaf || oldState.serverDeaf !== newState.serverDeaf) {
      const isDeafened = newState.selfDeaf || newState.serverDeaf;
      const embed = new EmbedBuilder()
        .setColor(isDeafened ? 0xfaa81a : 0x57f287)
        .setTitle(isDeafened ? '🔕 تعطيل السماع' : '🔔 تفعيل السماع')
        .addFields(
          { name: '👤 العضو', value: `${member.user} — \`${member.user.tag}\``, inline: true },
          { name: '🔊 القناة', value: `\`${newState.channel?.name || 'غير معروف'}\``, inline: true },
          { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
        );
      return sendLog(client, guildId, 'voiceDeafen', embed);
    }
  }
};
