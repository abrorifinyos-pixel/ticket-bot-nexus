const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addSong } = require('../utils/musicManager');
const { ICON_URL } = require('../utils/logManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('تشغيل أغنية من يوتيوب')
    .addStringOption(opt =>
      opt.setName('query').setDescription('اسم الأغنية أو الرابط').setRequired(true)
    ),

  async execute(interaction, client) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '❌ يجب أن تكون في قناة صوتية أولاً!', flags: 64 });
    }

    const botVoice = interaction.guild.members.me.voice.channel;
    if (botVoice && botVoice.id !== voiceChannel.id) {
      return interaction.reply({ content: '❌ البوت في قناة صوتية أخرى!', flags: 64 });
    }

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    try {
      const { queue, song, isNew } = await addSong(
        interaction.guildId,
        voiceChannel,
        interaction.channel,
        query,
        `${interaction.user}`
      );

      if (isNew) {
        // Now playing message sent by musicManager
        await interaction.editReply({ content: `🎵 جارٍ تشغيل **${song.title}**` });
      } else {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle('➕ تمت إضافتها للقائمة')
              .setDescription(`**[${song.title}](${song.url})**`)
              .addFields(
                { name: '⏱️ المدة', value: song.duration || 'غير معروف', inline: true },
                { name: '📊 الترتيب في القائمة', value: `#${queue.songs.length}`, inline: true },
              )
              .setThumbnail(song.thumbnail || null)
              .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
          ]
        });
      }
    } catch (err) {
      await interaction.editReply({ content: `❌ ${err.message}` });
    }
  }
};
