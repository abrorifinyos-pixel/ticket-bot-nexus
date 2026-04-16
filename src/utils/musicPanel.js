const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ICON_URL } = require('./logManager');

function buildMusicPanel(queue, song) {
  const isPlaying = !!song;
  const isLooping = queue?.loop || false;
  const queueCount = queue?.songs?.length || 0;

  const embed = new EmbedBuilder()
    .setColor(isPlaying ? 0x5865f2 : 0x2f3136)
    .setAuthor({ name: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭 — Music Player', iconURL: ICON_URL })
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  if (isPlaying && song) {
    embed
      .setTitle(`🎵 ${song.title}`)
      .setURL(song.url)
      .setThumbnail(song.thumbnail || null)
      .addFields(
        { name: '🎤 القناة', value: song.channel || 'غير معروف', inline: true },
        { name: '⏱️ المدة', value: song.duration || '??:??', inline: true },
        { name: '👤 طلب بواسطة', value: song.requestedBy || 'غير معروف', inline: true },
        { name: '📋 في القائمة', value: `${queueCount} أغنية`, inline: true },
        { name: '🔁 التكرار', value: isLooping ? '🟢 مفعّل' : '🔴 معطّل', inline: true },
      )
      .setDescription('> `' + '▶'.repeat(20) + '`');
  } else {
    embed
      .setTitle('🎵 مشغّل الموسيقى')
      .setDescription('> القائمة فارغة. استخدم `/play` لتشغيل أغنية.')
      .setImage('https://i.imgur.com/3XbIqsv.gif');
  }

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_prev')
      .setEmoji('⏮️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!isPlaying),
    new ButtonBuilder()
      .setCustomId('music_pause_resume')
      .setEmoji(isPlaying ? '⏸️' : '▶️')
      .setStyle(isPlaying ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(!isPlaying),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!isPlaying),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!isPlaying),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_loop')
      .setEmoji('🔁')
      .setLabel(isLooping ? 'تكرار: ON' : 'تكرار: OFF')
      .setStyle(isLooping ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!isPlaying),
    new ButtonBuilder()
      .setCustomId('music_queue')
      .setEmoji('📋')
      .setLabel('القائمة')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_vol_down')
      .setEmoji('🔉')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!isPlaying),
    new ButtonBuilder()
      .setCustomId('music_vol_up')
      .setEmoji('🔊')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!isPlaying),
  );

  return { embed, components: [row1, row2] };
}

module.exports = { buildMusicPanel };
