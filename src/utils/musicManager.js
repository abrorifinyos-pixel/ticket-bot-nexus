const {
  joinVoiceChannel, createAudioPlayer, createAudioResource,
  AudioPlayerStatus, VoiceConnectionStatus, entersState, StreamType
} = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const YouTubeSearch = require('youtube-sr').default;

const queues = new Map();

function getQueue(guildId) {
  return queues.get(guildId) || null;
}

function createQueue(guildId, textChannel, voiceChannel) {
  const queue = {
    guildId,
    songs: [],
    player: createAudioPlayer(),
    connection: null,
    volume: 1,
    loop: false,
    textChannel,
    voiceChannel,
    panelMessage: null,
  };
  queues.set(guildId, queue);
  return queue;
}

function deleteQueue(guildId) {
  const queue = queues.get(guildId);
  if (queue) {
    try { queue.player.stop(true); } catch {}
    try { queue.connection?.destroy(); } catch {}
    queues.delete(guildId);
  }
}

async function connectToVoice(queue) {
  queue.connection = joinVoiceChannel({
    channelId: queue.voiceChannel.id,
    guildId: queue.voiceChannel.guild.id,
    adapterCreator: queue.voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  await entersState(queue.connection, VoiceConnectionStatus.Ready, 15_000);
  queue.connection.subscribe(queue.player);

  queue.connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(queue.connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(queue.connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      deleteQueue(queue.guildId);
    }
  });
}

async function searchSong(query) {
  // Check if it's a YouTube URL
  if (ytdl.validateURL(query)) {
    const info = await ytdl.getInfo(query);
    const details = info.videoDetails;
    return {
      title: details.title,
      url: details.video_url,
      duration: formatDuration(parseInt(details.lengthSeconds)),
      thumbnail: details.thumbnails?.at(-1)?.url || null,
      channel: details.author?.name || 'غير معروف',
    };
  }

  // Search on YouTube
  const results = await YouTubeSearch.search(query, { limit: 1, type: 'video' });
  if (!results || results.length === 0) throw new Error('لم يتم العثور على نتائج');
  const video = results[0];
  return {
    title: video.title,
    url: `https://www.youtube.com/watch?v=${video.id}`,
    duration: formatDuration(video.duration / 1000),
    thumbnail: video.thumbnail?.url || null,
    channel: video.channel?.name || 'غير معروف',
  };
}

async function playSong(queue, song) {
  if (!song) {
    if (queue.textChannel) {
      queue.textChannel.send('📭 انتهت قائمة الأغاني. شكراً على الاستماع!').catch(() => {});
    }
    updatePanel(queue, null);
    setTimeout(() => deleteQueue(queue.guildId), 10_000);
    return;
  }

  try {
    const stream = ytdl(song.url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25,
    });

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });

    queue.player.play(resource);

    queue.player.removeAllListeners(AudioPlayerStatus.Idle);
    queue.player.once(AudioPlayerStatus.Idle, () => {
      if (queue.loop && queue.songs.length > 0) {
        playSong(queue, queue.songs[0]);
      } else {
        queue.songs.shift();
        playSong(queue, queue.songs[0]);
      }
    });

    queue.player.removeAllListeners('error');
    queue.player.on('error', (err) => {
      console.error('خطأ في المشغّل:', err.message);
      queue.songs.shift();
      playSong(queue, queue.songs[0]);
    });

    // Update the control panel
    await updatePanel(queue, song);

  } catch (err) {
    console.error('خطأ في تشغيل الأغنية:', err.message);
    if (queue.textChannel) {
      queue.textChannel.send(`❌ فشل تشغيل **${song.title}**، أنتقل للتالية...`).catch(() => {});
    }
    queue.songs.shift();
    playSong(queue, queue.songs[0]);
  }
}

async function updatePanel(queue, song) {
  const { buildMusicPanel } = require('./musicPanel');
  if (!queue.textChannel) return;

  try {
    const { embed, components } = buildMusicPanel(queue, song);
    if (queue.panelMessage) {
      await queue.panelMessage.edit({ embeds: [embed], components }).catch(async () => {
        queue.panelMessage = await queue.textChannel.send({ embeds: [embed], components });
      });
    } else {
      queue.panelMessage = await queue.textChannel.send({ embeds: [embed], components });
    }
  } catch (err) {
    console.error('خطأ في تحديث اللوحة:', err.message);
  }
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '??:??';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

module.exports = { getQueue, createQueue, deleteQueue, connectToVoice, playSong, searchSong, updatePanel, formatDuration };
