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
    .setDescription('Open the bot control panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const settings = getSettings(interaction.guildId);
    await showMainPanel(interaction, settings, client, false);
  }
};

async function showMainPanel(interaction, settings, client, isUpdate = false) {
  const cats = settings.categories || [];
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Control Panel — 𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭')
    .setDescription('Manage your ticket system from here.')
    .addFields(
      { name: '📂 Categories', value: cats.length ? cats.map(c => `${c.emoji || '🎫'} ${c.label}`).join('\n') : 'None configured', inline: false },
      { name: '📋 Logs Channel', value: settings.logsChannelId ? `<#${settings.logsChannelId}>` : 'Not set', inline: true },
      { name: '⭐ Ratings Channel', value: settings.ratingsChannelId ? `<#${settings.ratingsChannelId}>` : 'Not set', inline: true },
      { name: '📁 Ticket Category', value: settings.categoryId ? `<#${settings.categoryId}>` : 'Not set', inline: true },
      { name: '👑 Staff Roles', value: (settings.staffRoleIds || []).map(r => `<@&${r}>`).join(', ') || 'Not set', inline: false },
    )
    .setColor(0x5865f2)
    .setThumbnail(ICON_URL)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cp_categories').setLabel('Manage Categories').setEmoji('📂').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cp_logs').setLabel('Set Logs Channel').setEmoji('📋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cp_ratings').setLabel('Set Ratings Channel').setEmoji('⭐').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cp_category').setLabel('Set Category').setEmoji('📁').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cp_roles').setLabel('Set Staff Roles').setEmoji('👑').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cp_panel').setLabel('Send Ticket Panel').setEmoji('🎫').setStyle(ButtonStyle.Success),
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
      if (i.customId === 'cp_categories') {
        await showCategoriesPanel(i, s, interaction.guildId);
      } else if (i.customId === 'cp_logs') {
        await showChannelSelector(i, interaction.guildId, 'logs');
      } else if (i.customId === 'cp_ratings') {
        await showChannelSelector(i, interaction.guildId, 'ratings');
      } else if (i.customId === 'cp_category') {
        await showCategorySelector(i, interaction.guildId);
      } else if (i.customId === 'cp_roles') {
        await showRolesInput(i, interaction.guildId);
      } else if (i.customId === 'cp_panel') {
        await handleSendPanel(i, client, interaction.guildId);
      } else if (i.customId === 'cp_back') {
        await showMainPanel(i, getSettings(interaction.guildId), client, true);
      } else if (i.customId === 'cp_add_category') {
        await showAddCategoryModal(i, interaction.guildId);
      } else if (i.customId === 'cp_delete_cat_select') {
        const catId = i.values[0];
        const cur = getSettings(interaction.guildId);
        const cats2 = (cur.categories || []).filter(c => c.id !== catId);
        updateSettings(interaction.guildId, { categories: cats2 });
        await i.reply({ content: `✅ Category deleted.`, flags: 64 });
      }
    } catch (err) {
      console.error('Control panel collector error:', err);
      if (!i.replied && !i.deferred) {
        await i.reply({ content: '❌ An error occurred.', flags: 64 }).catch(() => {});
      }
    }
  });
}

async function showCategoriesPanel(interaction, settings, guildId) {
  const cats = settings.categories || [];
  const embed = new EmbedBuilder()
    .setTitle('📂 Manage Categories')
    .setDescription(cats.length ? cats.map(c => `${c.emoji || '🎫'} **${c.label}** — ID: \`${c.id}\``).join('\n') : 'No categories yet. Add one!')
    .setColor(0x5865f2)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL });

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cp_add_category').setLabel('Add Category').setEmoji('➕').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cp_back').setLabel('Back').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
    )
  ];

  if (cats.length > 0) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('cp_delete_cat_select')
        .setPlaceholder('Select category to delete...')
        .addOptions(cats.slice(0, 25).map(c => ({
          label: `Delete: ${c.label}`,
          value: c.id,
          emoji: c.emoji || '🗑️',
        })))
    ));
  }

  await interaction.update({ embeds: [embed], components: rows });
}

async function showAddCategoryModal(interaction, guildId) {
  const modal = new ModalBuilder()
    .setCustomId('cp_modal_add_category')
    .setTitle('Add New Category');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_id').setLabel('Category ID (no spaces, lowercase)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('e.g. support')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_label').setLabel('Category Label').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('e.g. General Support')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_emoji').setLabel('Emoji').setStyle(TextInputStyle.Short).setRequired(false).setValue('🎫')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('cat_desc').setLabel('Description (optional)').setStyle(TextInputStyle.Short).setRequired(false)
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
    if (cats.find(c => c.id === id)) {
      return submitted.reply({ content: '❌ A category with that ID already exists.', flags: 64 });
    }
    cats.push({ id, label, emoji, description });
    updateSettings(guildId, { categories: cats });
    await submitted.reply({ content: `✅ Category **${emoji} ${label}** added successfully!`, flags: 64 });
  } catch (err) {
    if (!err.message?.includes('time')) console.error('Add category modal error:', err);
  }
}

async function showChannelSelector(interaction, guildId, type) {
  const channels = [...interaction.guild.channels.cache
    .filter(c => c.type === ChannelType.GuildText)
    .sort((a, b) => a.name.localeCompare(b.name))
    .values()].slice(0, 25);

  if (!channels.length) {
    return interaction.update({ content: '❌ No text channels found.', embeds: [], components: [] });
  }

  const embed = new EmbedBuilder()
    .setTitle(type === 'logs' ? '📋 Select Logs Channel' : '⭐ Select Ratings Channel')
    .setColor(0x5865f2);

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`cp_select_${type}`)
      .setPlaceholder('Select a channel...')
      .addOptions(channels.map(c => ({ label: `#${c.name}`, value: c.id })))
  );
  const back = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cp_back').setLabel('Back').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row, back] });

  const sel = interaction.message.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id && i.customId === `cp_select_${type}`,
    time: 60_000, max: 1
  });
  sel.on('collect', async i => {
    const channelId = i.values[0];
    const patch = type === 'logs' ? { logsChannelId: channelId } : { ratingsChannelId: channelId };
    updateSettings(guildId, patch);
    await i.reply({ content: `✅ Channel set to <#${channelId}>`, flags: 64 });
  });
}

async function showCategorySelector(interaction, guildId) {
  const cats = [...interaction.guild.channels.cache
    .filter(c => c.type === ChannelType.GuildCategory)
    .values()].slice(0, 25);

  if (!cats.length) {
    return interaction.update({ content: '❌ No category channels found.', embeds: [], components: [] });
  }

  const embed = new EmbedBuilder().setTitle('📁 Select Ticket Category').setColor(0x5865f2);
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('cp_select_ticketcat')
      .setPlaceholder('Select a category...')
      .addOptions(cats.map(c => ({ label: c.name, value: c.id })))
  );
  const back = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cp_back').setLabel('Back').setEmoji('◀️').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row, back] });

  const sel = interaction.message.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id && i.customId === 'cp_select_ticketcat',
    time: 60_000, max: 1
  });
  sel.on('collect', async i => {
    updateSettings(guildId, { categoryId: i.values[0] });
    await i.reply({ content: `✅ Ticket category set to <#${i.values[0]}>`, flags: 64 });
  });
}

async function showRolesInput(interaction, guildId) {
  const modal = new ModalBuilder().setCustomId('cp_modal_roles').setTitle('Set Staff Roles');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('role_ids')
        .setLabel('Role IDs (comma-separated)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('123456789, 987654321')
    )
  );

  await interaction.showModal(modal);

  try {
    const submitted = await interaction.awaitModalSubmit({ time: 120_000, filter: i => i.user.id === interaction.user.id && i.customId === 'cp_modal_roles' });
    const raw = submitted.fields.getTextInputValue('role_ids');
    const roleIds = raw.split(',').map(r => r.trim().replace(/[<@&>]/g, '')).filter(Boolean);
    updateSettings(guildId, { staffRoleIds: roleIds });
    await submitted.reply({ content: `✅ Staff roles updated: ${roleIds.map(r => `<@&${r}>`).join(', ')}`, flags: 64 });
  } catch (err) {
    if (!err.message?.includes('time')) console.error('Roles modal error:', err);
  }
}

async function handleSendPanel(interaction, client, guildId) {
  const settings = getSettings(guildId);
  if (!settings.categories || settings.categories.length === 0) {
    return interaction.reply({ content: '❌ No categories configured. Add categories first via "Manage Categories".', flags: 64 });
  }
  try {
    await sendTicketPanel(interaction.channel, settings, guildId);
    await interaction.reply({ content: '✅ Ticket panel sent to this channel!', flags: 64 });
  } catch (err) {
    console.error('Send panel error:', err);
    await interaction.reply({ content: `❌ Error: ${err.message}`, flags: 64 });
  }
}
