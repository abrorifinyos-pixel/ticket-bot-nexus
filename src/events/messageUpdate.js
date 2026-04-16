const { EmbedBuilder } = require('discord.js');
const { sendLog, formatTime } = require('../utils/logManager');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    if (!oldMessage.content && !newMessage.content) return;

    const embed = new EmbedBuilder()
      .setColor(0xfaa81a)
      .setTitle('✏️ تعديل رسالة')
      .setURL(newMessage.url)
      .addFields(
        { name: '👤 العضو', value: `${newMessage.author} — \`${newMessage.author.tag}\``, inline: true },
        { name: '📌 الروم', value: `${newMessage.channel}`, inline: true },
        { name: '📝 قبل', value: (oldMessage.content || 'فارغ').slice(0, 1024), inline: false },
        { name: '📝 بعد', value: (newMessage.content || 'فارغ').slice(0, 1024), inline: false },
        { name: '🔗 رابط', value: `[اضغط هنا](${newMessage.url})`, inline: true },
        { name: '🕒 الوقت', value: formatTime(new Date()), inline: true },
      );

    await sendLog(client, newMessage.guild.id, 'messageUpdate', embed);
  }
};
