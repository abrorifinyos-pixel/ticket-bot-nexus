const { EmbedBuilder } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('👋 انضمام عضو جديد')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 العضو', value: `${member.user} — \`${member.user.tag}\``, inline: true },
        { name: '🪪 الـ ID', value: `\`${member.user.id}\``, inline: true },
        { name: '📅 تاريخ إنشاء الحساب', value: formatTime(member.user.createdAt), inline: false },
        { name: '👥 عدد الأعضاء الآن', value: `\`${member.guild.memberCount}\``, inline: true },
        { name: '🤖 بوت؟', value: member.user.bot ? 'نعم' : 'لا', inline: true },
        { name: '🕒 وقت الانضمام', value: formatTime(new Date()), inline: false },
      );
    await sendLog(client, member.guild.id, 'memberJoin', embed);
  }
};
