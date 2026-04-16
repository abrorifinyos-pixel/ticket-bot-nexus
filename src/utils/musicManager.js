const {
  joinVoiceChannel, createAudioPlayer, createAudioResource,
  AudioPlayerStatus, VoiceConnectionStatus, entersState, getVoiceConnection
} = require('@discordjs/voice');
const playdl = require('play-dl');

const queues = new Map();

function getQueue(guildId) {
  return queues.get(guildId) || null;
}

function createQueue(guildId) {
  const queue = {
    guildId,
    songs: [],
    player: createAudioPlayer(),
    connection: null,
    volume: 100,
    loop: false,
    textChannel: null,
  };
  queues.set(guildId, queue);
  return queue;
}

function deleteQueue(guildId) {
  const queue = queues.get(guildId);
  if (queue) {
    if (queue.player) queue.player.stop(true);
    if (queue.connection) queue.connection.destroy();
    queues.delete(guildId);
  }
}

async function connectToVoice(queue, voiceChannel) {
  queue.connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  queue.connection.subscribe(queue.player);

  queue.connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(queue.connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(queue.connection, VoiceConnectionStatus.Connecting, 5000),
      ]);
    } catch {
      deleteQueue(voiceChannel.guild.id);
    }
  });

  return queue.connection;
}

async function playSong(queue, song) {
  if (!song) {
    if (queue.textChannel) {
      queue.textChannel.send('📭 انتهت قائمة الأغاني. خرجت من الصوت.').catch(() => {});
    }
    setTimeout(() => deleteQueue(queue.guildId), 5000);
    return;
  }

  try {
    const stream = await playdl.stream(song.url, { quality: 2 });
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });

    queue.player.play(resource);

    queue.player.removeAllListeners(AudioPlayerStatus.Idle);
    queue.player.once(AudioPlayerStatus.Idle, () => {
      if (queue.loop && queue.songs.length > 0) {
        queue.songs.push(queue.songs.shift());
        playSong(queue, queue.songs[0]);
      } else {
        queue.songs.shift();
        playSong(queue, queue.songs[0]);
      }
    });

    if (queue.textChannel) {
      const { EmbedBuilder } = require('discord.js');
      const { ICON_URL } = require('./logManager');
      queue.textChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('🎵 يتم التشغيل الآن')
            .setDescription(`**[${song.title}](${song.url})**`)
            .addFields(
              { name: '⏱️ المدة', value: song.duration || 'غير معروف', inline: true },
              { name: '👤 طلب بواسطة', value: song.requestedBy || 'غير معروف', inline: true },
              { name: '🔁 تكرار', value: queue.loop ? 'مفعّل' : 'معطّل', inline: true },
            )
            .setThumbnail(song.thumbnail || null)
            .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
        ]
      }).catch(() => {});
    }
  } catch (err) {
    console.error('خطأ في تشغيل الأغنية:', err.message);
    if (queue.textChannel) {
      queue.textChannel.send(`❌ فشل تشغيل **${song.title}**، انتقل للتالية...`).catch(() => {});
    }
    queue.songs.shift();
    playSong(queue, queue.songs[0]);
  }
}

async function addSong(guildId, voiceChannel, textChannel, query, requestedBy) {
  let queue = getQueue(guildId);
  let isNew = false;

  if (!queue) {
    queue = createQueue(guildId);
    queue.textChannel = textChannel;
    isNew = true;
  }

  // Search or validate URL
  let songInfo;
  try {
    const type = await playdl.validate(query);
    if (type === 'yt_video') {
      const info = await playdl.video_info(query);
      songInfo = {
        title: info.video_details.title,
        url: info.video_details.url,
        duration: info.video_details.durationRaw,
        thumbnail: info.video_details.thumbnails?.[0]?.url,
        requestedBy,
      };
    } else {
      const results = await playdl.search(query, { source: { youtube: 'video' }, limit: 1 });
      if (!results || results.length === 0) throw new Error('لا توجد نتائج');
      const video = results[0];
      songInfo = {
        title: video.title,
        url: video.url,
        duration: video.durationRaw,
        thumbnail: video.thumbnails?.[0]?.url,
        requestedBy,
      };
    }
  } catch (err) {
    throw new Error('فشل البحث: ' + err.message);
  }

  queue.songs.push(songInfo);

  if (isNew) {
    await connectToVoice(queue, voiceChannel);
    playSong(queue, queue.songs[0]);
  }

  return { queue, song: songInfo, isNew };
}

module.exports = { getQueue, createQueue, deleteQueue, addSong, playSong, connectToVoice };
