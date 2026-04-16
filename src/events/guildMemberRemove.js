const { EmbedBuilder } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => `${r}`).join(', ') || 'لا يوجد';
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('🚪 مغادرة عضو')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 العضو', value: `${member.user} — \`${member.user.tag}\``, inline: true },
        { name: '🪪 الـ ID', value: `\`${member.user.id}\``, inline: true },
        { name: '🎭 رتبه', value: roles.length > 1000 ? roles.slice(0, 1000) + '...' : roles, inline: false },
        { name: '📅 انضم في', value: member.joinedAt ? formatTime(member.joinedAt) : 'غير معروف', inline: true },
        { name: '🕒 وقت المغادرة', value: formatTime(new Date()), inline: true },
      );
    await sendLog(client, member.guild.id, 'memberLeave', embed);
  }
};
