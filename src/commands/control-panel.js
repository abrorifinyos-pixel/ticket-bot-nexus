const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder,
  TextInputStyle, PermissionFlagsBits, ChannelType
} = require('discord.js');
const { getSettings, updateSettings } = require('../utils/guildSettings');
const { ICON_URL } = require('../utils/ticketManager');
const { sendTicketPanel } = require('../utils/autoSetup');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('control-panel')
    .setDescription('فتح لوحة تحكم البوت')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const settings = getSettings(interaction.guildId);
    await showMainPanel(interaction, settings, client, false);
  }
};

async function showMainPanel(interaction, settings, client, isUpdate = false) {
  const cats = settings.categories || [];
  const embed = new EmbedBuilder()
    .setTitle('⚙️ لوحة التحكم — 𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭')
    .setDescription('تحكم في نظام التذاكر من هنا.')
    .addFields(
      { name: '📂 الأقسام', value: cats.length ? cats.map(c => `${c.emoji || '🎫'} ${c.label}`).join('\n') : 'لا يوجد أقسام', inline: false },
      { name: '📋 روم اللوغات', value: settings.logsChannelId ? `<#${settings.logsChannelId}>` : 'غير محدد', inline: true },
      { name: '⭐ روم التقييم', value: settings.ratingsChannelId ? `<#${settings.ratingsChannelId}>` : 'غير محدد', inline: true },
      { name: '📁 كاتاغوري التذاكر', value: settings.categoryId ? `<#${settings.categoryId}>` : 'غير محدد', inline: true },
      { name: '👑 رولات الستاف', value: (settings.staffRoleIds || []).map(r => `<@&${r}>`).join(', ') || 'غير محدد', inline: false },
    )
    .setColor(0x5865f2)
    .setThumbnail(ICON_URL)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cp_categories').setLabel('إدارة الأقسام').setEmoji('📂').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cp_logs').setLabel('روم اللوغات').setEmoji('📋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cp_ratings').setLabel('روم التقييم').setEmoji('⭐').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cp_category').setLabel('الكاتاغوري').setEmoji('📁').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cp_roles').setLabel('رولات الستاف').setEmoji('👑').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cp_panel').setLabel('إرسال واجهة التذاكر').setEmoji('🎫').setStyle(ButtonStyle.Success),
  );

  const payload = { embeds: [embed], components: [row1, row2], flags: 64 };

  let reply;
  if (isUpdate && interaction.isButton()) {
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
    const s = getSettings(interaction.guildId);
    try {
      if (i.customId === 'cp_categories') await showCategoriesPanel(i, s, interaction.guildId);
      else if (i.customId === 'cp_logs') await showChannelSelector(i, interaction.guildId, 'logs');
      else if (i.customId === 'cp_ratings') await showChannelSelector(i, interaction.guildId, 'ratings');
      else if (i.customId === 'cp_category') await showCategorySelector(i, interaction.guildId);
      else if (i.customId === 'cp_roles') await showRolesInput(i, interaction.guildId);
      else if (i.customId === 'cp_panel') await handleSendPanel(i, client, interaction.guildId);
      else if (i.customId === 'cp_back') await showMainPanel(i, getSettings(interaction.guildId), client, true);
      else if (i.customId === 'cp_add_category') await showAddCategoryModal(i, interaction.guildId);
      else if (i.customId === 'cp_delete_cat_select') {
        const catId = i.values[0];
        const cur = getSettings(interaction.guildId);
        updateSettings(interaction.guildId, { categories: (cur.categories || []).filter(c => c.id !== catId) });
        await i.reply({ content: `✅ تم حذف القسم.`, flags: 64 });
      }
    } catch (err) {
      console.error('خطأ في لوحة التحكم:', err);
      if (!i.replied && !i.deferred) await i.reply({ content: '❌ حدث خطأ.', flags: 64 }).catch(() => {});
    }
  });
}

async function showCategoriesPanel(interaction, settings, guildId) {
  const cats = settings.categories || [];
  const embed = new EmbedBuilder()
    .setTitle('📂 إدارة الأقسام')
    .setDescription(cats.length ? cats.map(c => `${c.emoji || '🎫'} **${c.label}** — ID: \`${c.id}\``).join('\n') : 'لا يوجد أقسام. أضف قسماً!')
    .setColor(0x5865f2)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL });

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cp_add_category').setLabel('إضافة قسم').setEmoji('➕').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cp_back').setLabel('رجوع').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
    )
  ];

  if (cats.length > 0) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('cp_delete_cat_select')
        .setPlaceholder('اختر قسماً للحذف...')
        .addOptions(cats.slice(0, 25).map(c => ({
          label: `حذف: ${c.label}`,
          value: c.id,
          emoji: c.emoji || '🗑️',
        })))
    ));
  }

  await interaction.update({ embeds: [embed], components: rows });
}

async function showAddCategoryModal(interaction, guildId) {
  const modal = new ModalBuilder().setCustomId('cp_modal_add_category').setTitle('إضافة قسم جديد');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_id').setLabel('معرّف القسم (بدون مسافات)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('مثال: support')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_label').setLabel('اسم القسم').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('مثال: دعم تقني')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_emoji').setLabel('الإيموجي').setStyle(TextInputStyle.Short).setRequired(false).setValue('🎫')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_desc').setLabel('الوصف (اختياري)').setStyle(TextInputStyle.Short).setRequired(false)
    ),
  );

  await interaction.showModal(modal);

  try {
    const submitted = await interaction.awaitModalSubmit({ time: 120_000, filter: i => i.user.id === interaction.user.id && i.customId === 'cp_modal_add_category' });
    const id = submitted.fields.getTextInputValue('cat_id').replace(/\s+/g, '-').toLowerCase();
    const label = submitted.fields.getTextInputValue('cat_label');
    const emoji = submitted.fields.getTextInputValue('cat_emoji') || '🎫';
    const description = submitted.fields.getTextInputValue('cat_desc') || '';

    const s = getSettings(guildId);
    const cats = s.categories || [];
    if (cats.find(c => c.id === id)) return submitted.reply({ content: '❌ يوجد قسم بهذا المعرّف مسبقاً.', flags: 64 });
    cats.push({ id, label, emoji, description });
    updateSettings(guildId, { categories: cats });
    await submitted.reply({ content: `✅ تم إضافة قسم **${emoji} ${label}** بنجاح!`, flags: 64 });
  } catch (err) {
    if (!err.message?.includes('time')) console.error(err);
  }
}

async function showChannelSelector(interaction, guildId, type) {
  const channels = [...interaction.guild.channels.cache
    .filter(c => c.type === ChannelType.GuildText)
    .sort((a, b) => a.name.localeCompare(b.name))
    .values()].slice(0, 25);

  if (!channels.length) return interaction.update({ content: '❌ لا توجد قنوات نصية.', embeds: [], components: [] });

  const titles = { logs: '📋 اختر روم اللوغات', ratings: '⭐ اختر روم التقييم' };
  const embed = new EmbedBuilder().setTitle(titles[type] || 'اختر قناة').setColor(0x5865f2);

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`cp_select_${type}`)
      .setPlaceholder('اختر قناة...')
      .addOptions(channels.map(c => ({ label: `#${c.name}`, value: c.id })))
  );
  const back = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cp_back').setLabel('رجوع').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row, back] });

  const sel = interaction.message.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id && i.customId === `cp_select_${type}`,
    time: 60_000, max: 1
  });
  sel.on('collect', async i => {
    const channelId = i.values[0];
    updateSettings(guildId, type === 'logs' ? { logsChannelId: channelId } : { ratingsChannelId: channelId });
    await i.reply({ content: `✅ تم تحديد القناة: <#${channelId}>`, flags: 64 });
  });
}

async function showCategorySelector(interaction, guildId) {
  const cats = [...interaction.guild.channels.cache
    .filter(c => c.type === ChannelType.GuildCategory)
    .values()].slice(0, 25);

  if (!cats.length) return interaction.update({ content: '❌ لا توجد كاتاغوري.', embeds: [], components: [] });

  const embed = new EmbedBuilder().setTitle('📁 اختر كاتاغوري التذاكر').setColor(0x5865f2);
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('cp_select_ticketcat')
      .setPlaceholder('اختر كاتاغوري...')
      .addOptions(cats.map(c => ({ label: c.name, value: c.id })))
  );
  const back = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cp_back').setLabel('رجوع').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row, back] });

  const sel = interaction.message.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id && i.customId === 'cp_select_ticketcat',
    time: 60_000, max: 1
  });
  sel.on('collect', async i => {
    updateSettings(guildId, { categoryId: i.values[0] });
    await i.reply({ content: `✅ تم تحديد الكاتاغوري: <#${i.values[0]}>`, flags: 64 });
  });
}

async function showRolesInput(interaction, guildId) {
  const modal = new ModalBuilder().setCustomId('cp_modal_roles').setTitle('تحديد رولات الستاف');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('role_ids')
        .setLabel('معرّفات الرولات مفصولة بفاصلة')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('123456789, 987654321')
    )
  );

  await interaction.showModal(modal);

  try {
    const submitted = await interaction.awaitModalSubmit({ time: 120_000, filter: i => i.user.id === interaction.user.id && i.customId === 'cp_modal_roles' });
    const roleIds = submitted.fields.getTextInputValue('role_ids').split(',').map(r => r.trim().replace(/[<@&>]/g, '')).filter(Boolean);
    updateSettings(guildId, { staffRoleIds: roleIds });
    await submitted.reply({ content: `✅ تم تحديث رولات الستاف: ${roleIds.map(r => `<@&${r}>`).join(', ')}`, flags: 64 });
  } catch (err) {
    if (!err.message?.includes('time')) console.error(err);
  }
}

async function handleSendPanel(interaction, client, guildId) {
  const settings = getSettings(guildId);
  if (!settings.categories || !settings.categories.length) {
    return interaction.reply({ content: '❌ لا يوجد أقسام. أضف أقساماً أولاً من "إدارة الأقسام".', flags: 64 });
  }
  try {
    await sendTicketPanel(interaction.channel, settings, guildId);
    await interaction.reply({ content: '✅ تم إرسال واجهة التذاكر بنجاح!', flags: 64 });
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: `❌ خطأ: ${err.message}`, flags: 64 });
  }
}
