const { EmbedBuilder } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'inviteCreate',
  async execute(invite, client) {
    if (!invite.guild) return;

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🔗 إنشاء دعوة جديدة')
      .addFields(
        { name: '🔗 الدعوة', value: `\`discord.gg/${invite.code}\``, inline: true },
        { name: '👤 بواسطة', value: invite.inviter ? `${invite.inviter} — \`${invite.inviter.tag}\`` : 'غير معروف', inline: true },
        { name: '📌 الروم', value: invite.channel ? `${invite.channel}` : 'غير معروف', inline: true },
        { name: '⏳ تنتهي خلال', value: invite.maxAge ? `${invite.maxAge / 3600} ساعة` : 'لا تنتهي', inline: true },
        { name: '👥 الحد الأقصى', value: invite.maxUses ? `\`${invite.maxUses}\`` : 'بلا حد', inline: true },
        { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
      );

    await sendLog(client, invite.guild.id, 'inviteCreate', embed);
  }
};
