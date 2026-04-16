const { EmbedBuilder } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'inviteDelete',
  async execute(invite, client) {
    if (!invite.guild) return;

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('🗑️ حذف دعوة')
      .addFields(
        { name: '🔗 الدعوة', value: `\`discord.gg/${invite.code}\``, inline: true },
        { name: '📌 الروم', value: invite.channel ? `${invite.channel}` : 'غير معروف', inline: true },
        { name: '🕒 الوقت', value: formatTime(new Date()), inline: false },
      );

    await sendLog(client, invite.guild.id, 'inviteDelete', embed);
  }
};
