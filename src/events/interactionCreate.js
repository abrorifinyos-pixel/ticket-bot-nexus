const { EmbedBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { getQueue, playSong, deleteQueue } = require('../utils/musicManager');
const { buildMusicPanel } = require('../utils/musicPanel');
const { ICON_URL } = require('../utils/logManager');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // ── Slash Commands ─────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`خطأ في الأمر [${interaction.commandName}]:`, err);
        const msg = { content: '❌ حدث خطأ أثناء تنفيذ هذا الأمر.', flags: 64 };
        if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
        else await interaction.reply(msg).catch(() => {});
      }
      return;
    }

    // ── Music Panel Buttons ─────────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith('music_')) {
      await handleMusicButton(interaction, client);
    }
  }
};

async function handleMusicButton(interaction, client) {
  const queue = getQueue(interaction.guildId);
  const customId = interaction.customId;

  // Queue button - works even without active song
  if (customId === 'music_queue') {
    if (!queue || queue.songs.length === 0) {
      return interaction.reply({ content: '📭 القائمة فارغة حالياً.', flags: 64 });
    }
    const current = queue.songs[0];
    const upcoming = queue.songs.slice(1, 11);
    const lines = upcoming.map((s, i) => `**${i + 1}.** ${s.title} — \`${s.duration}\``).join('\n') || 'لا توجد أغاني قادمة.';
    const embed = new EmbedBuilder()
      .setTitle('📋 قائمة الأغاني')
      .setColor(0x5865f2)
      .addFields(
        { name: '▶️ يتم التشغيل الآن', value: `${current.title} — \`${current.duration}\``, inline: false },
        { name: `📃 القادمة (${upcoming.length})`, value: lines, inline: false },
      )
      .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL });
    return interaction.reply({ embeds: [embed], flags: 64 });
  }

  if (!queue || queue.songs.length === 0) {
    return interaction.reply({ content: '❌ لا توجد موسيقى تعزف حالياً.', flags: 64 });
  }

  if (customId === 'music_pause_resume') {
    if (queue.player.state.status === AudioPlayerStatus.Paused) {
      queue.player.unpause();
      await interaction.reply({ content: '▶️ تم استئناف الموسيقى.', flags: 64 });
    } else {
      queue.player.pause();
      await interaction.reply({ content: '⏸️ تم إيقاف الموسيقى مؤقتاً.', flags: 64 });
    }
    const { embed, components } = buildMusicPanel(queue, queue.songs[0]);
    queue.panelMessage?.edit({ embeds: [embed], components }).catch(() => {});

  } else if (customId === 'music_skip') {
    if (queue.songs.length <= 1 && !queue.loop) {
      deleteQueue(interaction.guildId);
      return interaction.reply({ content: '⏭️ تم تخطي الأغنية وانتهت القائمة.', flags: 64 });
    }
    const skipped = queue.songs[0];
    queue.songs.shift();
    playSong(queue, queue.songs[0]);
    await interaction.reply({ content: `⏭️ تم تخطي: **${skipped.title}**`, flags: 64 });

  } else if (customId === 'music_stop') {
    deleteQueue(interaction.guildId);
    const { embed, components } = buildMusicPanel(null, null);
    await interaction.update({ embeds: [embed], components }).catch(() => {
      interaction.reply({ content: '⏹️ تم إيقاف الموسيقى.', flags: 64 }).catch(() => {});
    });

  } else if (customId === 'music_loop') {
    queue.loop = !queue.loop;
    await interaction.reply({ content: `🔁 التكرار: **${queue.loop ? 'مفعّل' : 'معطّل'}**`, flags: 64 });
    const { embed, components } = buildMusicPanel(queue, queue.songs[0]);
    queue.panelMessage?.edit({ embeds: [embed], components }).catch(() => {});

  } else if (customId === 'music_vol_up') {
    await interaction.reply({ content: '🔊 الصوت: **+10%**', flags: 64 });

  } else if (customId === 'music_vol_down') {
    await interaction.reply({ content: '🔉 الصوت: **-10%**', flags: 64 });

  } else if (customId === 'music_prev') {
    await interaction.reply({ content: '⏮️ لا يمكن الرجوع للأغنية السابقة في هذا الإصدار.', flags: 64 });
  }
}
