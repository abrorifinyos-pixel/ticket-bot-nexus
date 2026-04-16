const { SlashCommandBuilder } = require('discord.js');
const { getQueue, createQueue, connectToVoice, playSong, searchSong, updatePanel } = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('تشغيل أغنية (يوتيوب / بحث بالاسم)')
    .addStringOption(opt =>
      opt.setName('query').setDescription('اسم الأغنية أو رابط يوتيوب').setRequired(true)
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
    await interaction.deferReply({ flags: 64 });

    try {
      const song = await searchSong(query);
      song.requestedBy = `${interaction.user}`;

      let queue = getQueue(interaction.guildId);
      let isNew = false;

      if (!queue) {
        queue = createQueue(interaction.guildId, interaction.channel, voiceChannel);
        await connectToVoice(queue);
        isNew = true;
      } else {
        queue.textChannel = interaction.channel;
      }

      queue.songs.push(song);

      if (isNew) {
        await interaction.editReply({ content: `✅ جارٍ تشغيل: **${song.title}**` });
        playSong(queue, queue.songs[0]);
      } else {
        await interaction.editReply({ content: `✅ تمت الإضافة إلى القائمة (#${queue.songs.length}): **${song.title}**` });
        await updatePanel(queue, queue.songs[0]);
      }
    } catch (err) {
      console.error('خطأ في /play:', err.message);
      await interaction.editReply({ content: `❌ فشل البحث أو التشغيل: **${err.message}**` });
    }
  }
};
