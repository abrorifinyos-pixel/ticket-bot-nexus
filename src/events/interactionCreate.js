const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits,
  ChannelType
} = require('discord.js');
const { getSettings, updateSettings } = require('../utils/guildSettings');
const {
  ICON_URL, BANNER_URL,
  getTicket, createTicketRecord, updateTicket, deleteTicketRecord, nextTicketNumber
} = require('../utils/ticketManager');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // --- Slash Commands ---
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`Command error [${interaction.commandName}]:`, err);
        const msg = { content: '❌ An error occurred while running this command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
        else await interaction.reply(msg);
      }
      return;
    }

    // --- Select Menu: Create Ticket ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_create') {
      await handleTicketCreate(interaction, client);
      return;
    }

    // --- Buttons ---
    if (interaction.isButton()) {
      const [action, ...rest] = interaction.customId.split('_');

      if (interaction.customId.startsWith('ticket_close')) {
        await handleTicketClose(interaction, client);
      } else if (interaction.customId.startsWith('ticket_claim')) {
        await handleTicketClaim(interaction, client);
      } else if (interaction.customId.startsWith('ticket_adduser')) {
        await handleAddUser(interaction, client);
      } else if (interaction.customId.startsWith('ticket_removeuser')) {
        await handleRemoveUser(interaction, client);
      } else if (interaction.customId.startsWith('ticket_delete')) {
        await handleTicketDelete(interaction, client);
      } else if (interaction.customId.startsWith('ticket_reopen')) {
        await handleTicketReopen(interaction, client);
      } else if (interaction.customId.startsWith('rating_')) {
        await handleRating(interaction, client);
      }
    }

    // --- Modals ---
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('modal_adduser_')) {
        await handleAddUserModal(interaction, client);
      } else if (interaction.customId.startsWith('modal_removeuser_')) {
        await handleRemoveUserModal(interaction, client);
      } else if (interaction.customId.startsWith('modal_rating_')) {
        await handleRatingModal(interaction, client);
      }
    }
  }
};

// ─── Ticket Create ─────────────────────────────────────────────────────────────
async function handleTicketCreate(interaction, client) {
  const settings = getSettings(interaction.guildId);
  const categoryId = interaction.values[0];
  const category = (settings.categories || []).find(c => c.id === categoryId);

  if (!category) {
    return interaction.reply({ content: '❌ Category not found.', ephemeral: true });
  }

  const existing = interaction.guild.channels.cache.find(
    ch => ch.topic && ch.topic.includes(interaction.user.id) && ch.topic.includes('open')
  );
  if (existing) {
    return interaction.reply({
      content: `❌ You already have an open ticket: ${existing}`,
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const ticketNum = nextTicketNumber(interaction.guildId);
  const channelName = `${category.label.toLowerCase().replace(/\s+/g, '-')}-${String(ticketNum).padStart(4, '0')}`;

  const staffRoles = settings.staffRoleIds || [];
  const permOverwrites = [
    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    },
    ...staffRoles.map(rid => ({
      id: rid,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
    })),
    {
      id: client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
    }
  ];

  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: settings.categoryId || null,
    topic: `user:${interaction.user.id}:open`,
    permissionOverwrites: permOverwrites,
  });

  createTicketRecord(channel.id, {
    guildId: interaction.guildId,
    userId: interaction.user.id,
    categoryId,
    categoryLabel: category.label,
    channelId: channel.id,
    ticketNumber: ticketNum,
    status: 'open',
    claimedBy: null,
    createdAt: Date.now(),
  });

  const embed = new EmbedBuilder()
    .setTitle(`${category.emoji} ${category.label} | Ticket #${String(ticketNum).padStart(4, '0')}`)
    .setDescription(
      `Hello ${interaction.user}, welcome to your ticket!\n\n` +
      `**Category:** ${category.emoji} ${category.label}\n` +
      `**Status:** 🟢 Open\n\n` +
      `Please describe your issue and our team will assist you shortly.`
    )
    .setColor(0x5865f2)
    .setThumbnail(ICON_URL)
    .setImage(BANNER_URL)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Ticket').setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_adduser').setLabel('Add User').setEmoji('➕').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_removeuser').setLabel('Remove User').setEmoji('➖').setStyle(ButtonStyle.Secondary),
  );

  await channel.send({
    content: `${interaction.user} ${staffRoles.map(r => `<@&${r}>`).join(' ')}`,
    embeds: [embed],
    components: [buttons]
  });

  logEvent(client, interaction.guildId, 'open', { channel, user: interaction.user, ticket: { categoryLabel: category.label, ticketNumber: ticketNum } });

  await interaction.editReply({ content: `✅ Your ticket has been created: ${channel}` });
}

// ─── Ticket Close ──────────────────────────────────────────────────────────────
async function handleTicketClose(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ This channel is not a ticket.', ephemeral: true });
  if (ticket.status === 'closed') return interaction.reply({ content: '❌ Ticket is already closed.', ephemeral: true });

  const settings = getSettings(interaction.guildId);
  const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r));
  if (!isStaff && interaction.user.id !== ticket.userId) {
    return interaction.reply({ content: '❌ You do not have permission to close this ticket.', ephemeral: true });
  }

  await interaction.deferReply();

  updateTicket(interaction.channelId, { status: 'closed', closedBy: interaction.user.id, closedAt: Date.now() });

  await interaction.channel.permissionOverwrites.edit(ticket.userId, {
    SendMessages: false,
  });

  const embed = new EmbedBuilder()
    .setTitle('🔒 Ticket Closed')
    .setDescription(`This ticket has been closed by ${interaction.user}.\n\nPlease rate your experience below.`)
    .setColor(0xed4245)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  const ratingRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rating_1').setLabel('⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rating_2').setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rating_3').setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rating_4').setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rating_5').setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Success),
  );

  const deleteRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen').setEmoji('🔓').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete Ticket').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
  );

  await interaction.editReply({ embeds: [embed], components: [ratingRow, deleteRow] });

  logEvent(client, interaction.guildId, 'close', { channel: interaction.channel, user: interaction.user, ticket });
}

// ─── Ticket Reopen ─────────────────────────────────────────────────────────────
async function handleTicketReopen(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ Not a ticket channel.', ephemeral: true });

  const settings = getSettings(interaction.guildId);
  const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r));
  if (!isStaff) return interaction.reply({ content: '❌ Only staff can reopen tickets.', ephemeral: true });

  await interaction.channel.permissionOverwrites.edit(ticket.userId, {
    ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
  });

  updateTicket(interaction.channelId, { status: 'open', closedBy: null, closedAt: null });

  await interaction.reply({ content: '🔓 Ticket has been reopened.' });
}

// ─── Ticket Delete ─────────────────────────────────────────────────────────────
async function handleTicketDelete(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ Not a ticket channel.', ephemeral: true });
  if (ticket.status !== 'closed') {
    return interaction.reply({ content: '❌ You must close the ticket before deleting it.', ephemeral: true });
  }

  const settings = getSettings(interaction.guildId);
  const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r));
  if (!isStaff) return interaction.reply({ content: '❌ Only staff can delete tickets.', ephemeral: true });

  await interaction.reply({ content: '🗑️ Deleting ticket in 5 seconds...' });

  logEvent(client, interaction.guildId, 'delete', { channel: interaction.channel, user: interaction.user, ticket });

  setTimeout(async () => {
    deleteTicketRecord(interaction.channelId);
    await interaction.channel.delete().catch(() => {});
  }, 5000);
}

// ─── Claim Ticket ──────────────────────────────────────────────────────────────
async function handleTicketClaim(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ Not a ticket channel.', ephemeral: true });

  const settings = getSettings(interaction.guildId);
  const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r));
  if (!isStaff) return interaction.reply({ content: '❌ Only staff can claim tickets.', ephemeral: true });

  if (ticket.claimedBy) {
    return interaction.reply({ content: `❌ This ticket is already claimed by <@${ticket.claimedBy}>.`, ephemeral: true });
  }

  updateTicket(interaction.channelId, { claimedBy: interaction.user.id });

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(`🙋 Ticket claimed by ${interaction.user}`)
        .setColor(0x57f287)
    ]
  });
}

// ─── Add User ──────────────────────────────────────────────────────────────────
async function handleAddUser(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ Not a ticket channel.', ephemeral: true });

  const modal = new ModalBuilder()
    .setCustomId(`modal_adduser_${interaction.channelId}`)
    .setTitle('Add User to Ticket');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('user_id')
        .setLabel('User ID or mention')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    )
  );

  await interaction.showModal(modal);
}

async function handleAddUserModal(interaction, client) {
  const channelId = interaction.customId.replace('modal_adduser_', '');
  const rawInput = interaction.fields.getTextInputValue('user_id').replace(/[<@!>]/g, '');

  try {
    const member = await interaction.guild.members.fetch(rawInput);
    await interaction.channel.permissionOverwrites.edit(member, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true
    });
    await interaction.reply({ content: `✅ ${member} has been added to the ticket.` });
  } catch {
    await interaction.reply({ content: '❌ User not found.', ephemeral: true });
  }
}

// ─── Remove User ───────────────────────────────────────────────────────────────
async function handleRemoveUser(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ Not a ticket channel.', ephemeral: true });

  const modal = new ModalBuilder()
    .setCustomId(`modal_removeuser_${interaction.channelId}`)
    .setTitle('Remove User from Ticket');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('user_id')
        .setLabel('User ID or mention')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    )
  );

  await interaction.showModal(modal);
}

async function handleRemoveUserModal(interaction, client) {
  const channelId = interaction.customId.replace('modal_removeuser_', '');
  const rawInput = interaction.fields.getTextInputValue('user_id').replace(/[<@!>]/g, '');

  try {
    const member = await interaction.guild.members.fetch(rawInput);
    await interaction.channel.permissionOverwrites.delete(member);
    await interaction.reply({ content: `✅ ${member} has been removed from the ticket.` });
  } catch {
    await interaction.reply({ content: '❌ User not found.', ephemeral: true });
  }
}

// ─── Rating ────────────────────────────────────────────────────────────────────
async function handleRating(interaction, client) {
  const stars = parseInt(interaction.customId.replace('rating_', ''));
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ Not a ticket channel.', ephemeral: true });
  if (interaction.user.id !== ticket.userId) {
    return interaction.reply({ content: '❌ Only the ticket owner can rate.', ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_rating_${interaction.channelId}_${stars}`)
    .setTitle('Rate Your Experience');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('comment')
        .setLabel('Your comment (required)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(5)
    )
  );

  await interaction.showModal(modal);
}

async function handleRatingModal(interaction, client) {
  const parts = interaction.customId.split('_');
  const channelId = parts[2];
  const stars = parseInt(parts[3]);
  const comment = interaction.fields.getTextInputValue('comment');
  const ticket = getTicket(interaction.channelId);

  if (!ticket) return interaction.reply({ content: '❌ Ticket not found.', ephemeral: true });

  updateTicket(interaction.channelId, { rating: stars, ratingComment: comment });

  const settings = getSettings(interaction.guildId);
  const ratingsChannelId = settings.ratingsChannelId;

  if (ratingsChannelId) {
    const ratingsChannel = interaction.guild.channels.cache.get(ratingsChannelId);
    if (ratingsChannel) {
      const starsText = '⭐'.repeat(stars);
      const ratingEmbed = new EmbedBuilder()
        .setTitle('📝 New Ticket Rating')
        .addFields(
          { name: 'User', value: `<@${ticket.userId}>`, inline: true },
          { name: 'Rating', value: starsText, inline: true },
          { name: 'Category', value: ticket.categoryLabel || 'Unknown', inline: true },
          { name: 'Comment', value: comment },
          { name: 'Handled by', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Not claimed', inline: true },
        )
        .setColor(0xfee75c)
        .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
        .setTimestamp();

      await ratingsChannel.send({ embeds: [ratingEmbed] });
    }
  }

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(`✅ Thank you for your feedback! You rated us ${'⭐'.repeat(stars)}`)
        .setColor(0x57f287)
    ],
    ephemeral: true
  });
}

// ─── Log Event ─────────────────────────────────────────────────────────────────
async function logEvent(client, guildId, type, data) {
  const settings = getSettings(guildId);
  const logsChannelId = settings.logsChannelId;
  if (!logsChannelId) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const logsChannel = guild.channels.cache.get(logsChannelId);
  if (!logsChannel) return;

  const colors = { open: 0x57f287, close: 0xed4245, delete: 0x808080 };
  const icons = { open: '🎫', close: '🔒', delete: '🗑️' };

  const embed = new EmbedBuilder()
    .setTitle(`${icons[type] || '📋'} Ticket ${type.charAt(0).toUpperCase() + type.slice(1)}`)
    .addFields(
      { name: 'Channel', value: data.channel ? `#${data.channel.name}` : 'Unknown', inline: true },
      { name: 'User', value: data.user ? `${data.user}` : 'Unknown', inline: true },
      { name: 'Category', value: data.ticket?.categoryLabel || 'Unknown', inline: true },
      { name: 'Ticket #', value: String(data.ticket?.ticketNumber || '?').padStart(4, '0'), inline: true },
    )
    .setColor(colors[type] || 0x5865f2)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  await logsChannel.send({ embeds: [embed] }).catch(() => {});
}
