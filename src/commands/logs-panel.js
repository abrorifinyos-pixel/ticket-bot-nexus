const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits
} = require('discord.js');
const { getSettings, setLogSetting, toggleLog, LOG_TYPES } = require('../utils/guildSettings');
const { ICON_URL } = require('../utils/logManager');

const LOG_LABELS = {
  memberJoin:        { label: 'انضمام عضو',              emoji: '👋', cat: 'الأعضاء' },
  memberLeave:       { label: 'مغادرة عضو',              emoji: '🚪', cat: 'الأعضاء' },
  memberBan:         { label: 'حظر عضو',                 emoji: '🔨', cat: 'الأعضاء' },
  memberUnban:       { label: 'رفع حظر عضو',             emoji: '✅', cat: 'الأعضاء' },
  memberTimeout:     { label: 'مهلة عضو (Timeout)',       emoji: '⏰', cat: 'الأعضاء' },
  memberNickname:    { label: 'تغيير اللقب',              emoji: '✏️', cat: 'الأعضاء' },
  memberRoleAdd:     { label: 'إعطاء رتبة لعضو',          emoji: '➕', cat: 'الأعضاء' },
  memberRoleRemove:  { label: 'إزالة رتبة من عضو',        emoji: '➖', cat: 'الأعضاء' },
  roleCreate:        { label: 'إنشاء رتبة',               emoji: '🎭', cat: 'الرتب' },
  roleDelete:        { label: 'حذف رتبة',                 emoji: '🗑️', cat: 'الرتب' },
  roleUpdate:        { label: 'تعديل رتبة',               emoji: '⚙️', cat: 'الرتب' },
  messageDelete:     { label: 'حذف رسالة',                emoji: '🗑️', cat: 'الرسائل' },
  messageDeleteBulk: { label: 'حذف رسائل متعددة',         emoji: '💣', cat: 'الرسائل' },
  messageUpdate:     { label: 'تعديل رسالة',              emoji: '✏️', cat: 'الرسائل' },
  channelCreate:     { label: 'إنشاء روم',                emoji: '📁', cat: 'الرومات' },
  channelDelete:     { label: 'حذف روم',                  emoji: '🗑️', cat: 'الرومات' },
  channelUpdate:     { label: 'تعديل روم',                emoji: '⚙️', cat: 'الرومات' },
  channelPermUpdate: { label: 'تحديث صلاحيات روم',        emoji: '🔒', cat: 'الرومات' },
  threadCreate:      { label: 'إنشاء ثريد',               emoji: '🧵', cat: 'الثريد' },
  threadDelete:      { label: 'حذف ثريد',                 emoji: '🗑️', cat: 'الثريد' },
  threadUpdate:      { label: 'تعديل ثريد',               emoji: '✏️', cat: 'الثريد' },
  voiceJoin:         { label: 'انضمام لصوت',              emoji: '🎙️', cat: 'الصوت' },
  voiceLeave:        { label: 'مغادرة صوت',               emoji: '🚪', cat: 'الصوت' },
  voiceMove:         { label: 'نقل في الصوت',             emoji: '↔️', cat: 'الصوت' },
  voiceMute:         { label: 'كتم / فك كتم',             emoji: '🔇', cat: 'الصوت' },
  voiceDeafen:       { label: 'إصمات / فك إصمات',         emoji: '🔕', cat: 'الصوت' },
  serverUpdate:      { label: 'تعديل السيرفر',             emoji: '🌐', cat: 'السيرفر' },
  inviteCreate:      { label: 'إنشاء دعوة',               emoji: '🔗', cat: 'السيرفر' },
  inviteDelete:      { label: 'حذف دعوة',                 emoji: '🗑️', cat: 'السيرفر' },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs-panel')
    .setDescription('لوحة تحكم نظام اللوغات')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await showLogsPanel(interaction, client);
  }
};

async function showLogsPanel(interaction, client, isUpdate = false) {
  const settings = getSettings(interaction.guildId);
  const logSettings = settings.logSettings || {};

  const categories = {};
  for (const [type, info] of Object.entries(LOG_LABELS)) {
    if (!categories[info.cat]) categories[info.cat] = [];
    const cfg = logSettings[type] || {};
    categories[info.cat].push({ type, info, enabled: cfg.enabled && cfg.channelId, channelId: cfg.channelId });
  }

  const catEntries = Object.entries(categories);
  const totalEnabled = Object.values(logSettings).filter(l => l?.enabled && l?.channelId).length;

  const embed = new EmbedBuilder()
    .setTitle('📊 لوحة تحكم اللوغات — 𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭')
    .setDescription(`**${totalEnabled}** من أصل **${LOG_TYPES.length}** لوغ مفعّل\n\nاختر فئة من القائمة لإعداد لوغاتها.`)
    .setColor(0x5865f2)
    .setThumbnail(ICON_URL)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  for (const [cat, logs] of catEntries) {
    const lines = logs.map(l => `${l.enabled ? '🟢' : '🔴'} ${l.info.emoji} ${l.info.label}${l.channelId ? ` — <#${l.channelId}>` : ''}`);
    embed.addFields({ name: `📂 ${cat}`, value: lines.join('\n'), inline: false });
  }

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('logs_select_cat')
      .setPlaceholder('اختر فئة لإعدادها...')
      .addOptions(catEntries.map(([cat]) => ({
        label: cat,
        value: cat,
        emoji: '📂',
      })))
  );

  const btnsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('logs_enable_all').setLabel('تفعيل الكل').setEmoji('🟢').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('logs_disable_all').setLabel('تعطيل الكل').setEmoji('🔴').setStyle(ButtonStyle.Danger),
  );

  const payload = { embeds: [embed], components: [selectRow, btnsRow], flags: 64 };

  let reply;
  if (isUpdate && (interaction.isButton() || interaction.isStringSelectMenu())) {
    await interaction.update(payload).catch(() => {});
    reply = interaction.message;
  } else {
    await interaction.reply(payload);
    reply = await interaction.fetchReply();
  }

  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 600_000,
  });

  collector.on('collect', async i => {
    try {
      if (i.customId === 'logs_select_cat') {
        await showCategoryPanel(i, client, i.values[0], interaction.user.id, interaction.guildId, reply);
      } else if (i.customId === 'logs_enable_all') {
        const s = getSettings(interaction.guildId);
        const ls = s.logSettings || {};
        for (const [type, cfg] of Object.entries(ls)) {
          if (cfg?.channelId) {
            require('../utils/guildSettings').setLogSetting(interaction.guildId, type, cfg.channelId, true);
          }
        }
        await i.reply({ content: '🟢 تم تفعيل جميع اللوغات المضبوطة.', flags: 64 });
      } else if (i.customId === 'logs_disable_all') {
        const s = getSettings(interaction.guildId);
        const ls = s.logSettings || {};
        for (const type of Object.keys(ls)) {
          require('../utils/guildSettings').toggleLog(interaction.guildId, type);
          require('../utils/guildSettings').toggleLog(interaction.guildId, type);
          const cfg = (getSettings(interaction.guildId).logSettings || {})[type] || {};
          if (cfg.enabled) require('../utils/guildSettings').setLogSetting(interaction.guildId, type, cfg.channelId, false);
        }
        await i.reply({ content: '🔴 تم تعطيل جميع اللوغات.', flags: 64 });
      } else if (i.customId === 'logs_back') {
        collector.stop();
        await showLogsPanel(i, client, true);
      }
    } catch (err) {
      console.error('خطأ في لوحة اللوغات:', err);
      if (!i.replied && !i.deferred) await i.reply({ content: '❌ حدث خطأ.', flags: 64 }).catch(() => {});
    }
  });
}

async function showCategoryPanel(interaction, client, catName, userId, guildId, parentMsg) {
  const settings = getSettings(guildId);
  const logSettings = settings.logSettings || {};

  const logsInCat = Object.entries(LOG_LABELS).filter(([, info]) => info.cat === catName);

  const embed = new EmbedBuilder()
    .setTitle(`📂 ${catName} — إعدادات اللوغات`)
    .setColor(0x5865f2)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  const lines = logsInCat.map(([type, info]) => {
    const cfg = logSettings[type] || {};
    const status = cfg.enabled && cfg.channelId ? `🟢 ${cfg.channelId ? `<#${cfg.channelId}>` : 'مفعّل'}` : '🔴 معطّل';
    return `${info.emoji} **${info.label}** — ${status}`;
  });

  embed.setDescription(lines.join('\n') + '\n\nاختر لوغاً لتعديله:');

  const selectLog = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('logs_select_type')
      .setPlaceholder('اختر لوغاً...')
      .addOptions(logsInCat.map(([type, info]) => ({
        label: info.label,
        value: type,
        emoji: info.emoji.replace(/\uFE0F/g, '') || '📋',
      })))
  );

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('logs_back').setLabel('رجوع').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [selectLog, backRow] });

  const collector = interaction.message.createMessageComponentCollector({
    filter: i => i.user.id === userId && (i.customId === 'logs_select_type' || i.customId === 'logs_back'),
    time: 300_000,
    max: 20,
  });

  collector.on('collect', async i => {
    if (i.customId === 'logs_back') {
      collector.stop();
      return showLogsPanel(i, client, true);
    }
    if (i.customId === 'logs_select_type') {
      collector.stop();
      const logType = i.values[0];
      await showLogEditor(i, client, catName, logType, userId, guildId);
    }
  });
}

async function showLogEditor(interaction, client, catName, logType, userId, guildId) {
  const settings = getSettings(guildId);
  const logSettings = settings.logSettings || {};
  const cfg = logSettings[logType] || {};
  const info = LOG_LABELS[logType];

  const channels = [...interaction.guild.channels.cache
    .filter(c => c.type === ChannelType.GuildText)
    .sort((a, b) => a.name.localeCompare(b.name))
    .values()].slice(0, 25);

  const embed = new EmbedBuilder()
    .setTitle(`${info.emoji} ${info.label}`)
    .setDescription(
      `**الحالة:** ${cfg.enabled && cfg.channelId ? '🟢 مفعّل' : '🔴 معطّل'}\n` +
      `**الروم:** ${cfg.channelId ? `<#${cfg.channelId}>` : 'غير محدد'}\n\n` +
      `اختر روم اللوغ وفعّل أو عطّل هذا النوع:`
    )
    .setColor(cfg.enabled && cfg.channelId ? 0x57f287 : 0xed4245)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL });

  const channelSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('logs_set_channel')
      .setPlaceholder('اختر روم اللوغ...')
      .addOptions(channels.map(c => ({ label: `#${c.name}`, value: c.id })))
  );

  const toggleRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('logs_toggle')
      .setLabel(cfg.enabled && cfg.channelId ? 'تعطيل' : 'تفعيل')
      .setEmoji(cfg.enabled && cfg.channelId ? '🔴' : '🟢')
      .setStyle(cfg.enabled && cfg.channelId ? ButtonStyle.Danger : ButtonStyle.Success)
      .setDisabled(!cfg.channelId),
    new ButtonBuilder().setCustomId('logs_back_cat').setLabel('رجوع').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [channelSelect, toggleRow] });

  const collector = interaction.message.createMessageComponentCollector({
    filter: i => i.user.id === userId,
    time: 180_000,
    max: 5,
  });

  collector.on('collect', async i => {
    if (i.customId === 'logs_back_cat') {
      collector.stop();
      return showCategoryPanel(i, client, catName, userId, guildId, null);
    }
    if (i.customId === 'logs_set_channel') {
      const channelId = i.values[0];
      setLogSetting(guildId, logType, channelId, true);
      await i.reply({ content: `✅ تم تحديد روم اللوغ **${info.label}**: <#${channelId}>`, flags: 64 });
      collector.stop();
      return showLogEditor(i, client, catName, logType, userId, guildId);
    }
    if (i.customId === 'logs_toggle') {
      const isNowEnabled = toggleLog(guildId, logType);
      await i.reply({ content: `${isNowEnabled ? '🟢 تم تفعيل' : '🔴 تم تعطيل'} لوغ **${info.label}**`, flags: 64 });
      collector.stop();
      return showLogEditor(i, client, catName, logType, userId, guildId);
    }
  });
}
