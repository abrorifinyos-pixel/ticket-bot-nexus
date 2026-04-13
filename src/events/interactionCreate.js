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

    // ── Slash Commands ─────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`Command error [${interaction.commandName}]:`, err);
        const msg = { content: '❌ An error occurred while running this command.', flags: 64 };
        if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
        else await interaction.reply(msg).catch(() => {});
      }
      return;
    }

    // ── Select Menu: Create Ticket ─────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_create') {
      await handleTicketCreate(interaction, client);
      return;
    }

    // ── Buttons ────────────────────────────────────────────────
    if (interaction.isButton()) {
      if (interaction.customId === 'ticket_close') {
        await handleTicketClose(interaction, client);
      } else if (interaction.customId === 'ticket_claim') {
        await handleTicketClaim(interaction, client);
      } else if (interaction.customId === 'ticket_adduser') {
        await handleAddUser(interaction, client);
      } else if (interaction.customId === 'ticket_removeuser') {
        await handleRemoveUser(interaction, client);
      } else if (interaction.customId === 'ticket_delete') {
        await handleTicketDelete(interaction, client);
      } else if (interaction.customId === 'ticket_reopen') {
        await handleTicketReopen(interaction, client);
      } else if (interaction.customId.startsWith('rating_')) {
        await handleRating(interaction, client);
      }
      return;
    }

    // ── Modals ─────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────

function isStaff(interaction, settings) {
  return (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r));
}

// ── Ticket Create ──────────────────────────────────────────────
async function handleTicketCreate(interaction, client) {
  await interaction.deferReply({ flags: 64 });

  const settings = getSettings(interaction.guildId);
  const categoryId = interaction.values[0];
  const category = (settings.categories || []).find(c => c.id === categoryId);

  if (!category) {
    return interaction.editReply({ content: '❌ Category not found.' });
  }

  // Check for existing open ticket
  const existing = interaction.guild.channels.cache.find(
    ch => ch.topic && ch.topic.includes(`user:${interaction.user.id}:open`)
  );
  if (existing) {
    return interaction.editReply({ content: `❌ You already have an open ticket: ${existing}` });
  }

  const ticketNum = nextTicketNumber(interaction.guildId);
  const channelName = `${category.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${String(ticketNum).padStart(4, '0')}`;

  const staffRoles = settings.staffRoleIds || [];
  const permOverwrites = [
    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles]
    },
    ...staffRoles.map(rid => ({
      id: rid,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.AttachFiles]
    })),
    {
      id: client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages]
    }
  ];

  let channel;
  try {
    channel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: settings.categoryId || null,
      topic: `user:${interaction.user.id}:open`,
      permissionOverwrites: permOverwrites,
    });
  } catch (err) {
    console.error('Failed to create ticket channel:', err);
    return interaction.editReply({ content: '❌ Failed to create ticket channel. Check my permissions.' });
  }

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
    .setTitle(`${category.emoji || '🎫'} ${category.label} | Ticket #${String(ticketNum).padStart(4, '0')}`)
    .setDescription(
      `Hello ${interaction.user}! 👋\n\n` +
      `**Category:** ${category.emoji || '🎫'} ${category.label}\n` +
      `**Status:** 🟢 Open\n\n` +
      `Please describe your issue clearly and our team will assist you shortly.\n\n` +
      `> ⚠️ Do not ping staff — they will respond as soon as possible.`
    )
    .setColor(0x5865f2)
    .setThumbnail(ICON_URL)
    .setImage(BANNER_URL)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_adduser').setLabel('Add User').setEmoji('➕').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_removeuser').setLabel('Remove User').setEmoji('➖').setStyle(ButtonStyle.Secondary),
  );

  await channel.send({
    content: `${interaction.user} ${staffRoles.map(r => `<@&${r}>`).join(' ')}`,
    embeds: [embed],
    components: [buttons]
  });

  await logEvent(client, interaction.guildId, 'open', { channel, user: interaction.user, ticket: { categoryLabel: category.label, ticketNumber: ticketNum } });
  await interaction.editReply({ content: `✅ Your ticket has been created: ${channel}` });
}

// ── Ticket Close ───────────────────────────────────────────────
async function handleTicketClose(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ This channel is not a ticket.', flags: 64 });
  if (ticket.status === 'closed') return interaction.reply({ content: '❌ Ticket is already closed.', flags: 64 });

  const settings = getSettings(interaction.guildId);
  if (!isStaff(interaction, settings) && interaction.user.id !== ticket.userId) {
    return interaction.reply({ content: '❌ You do not have permission to close this ticket.', flags: 64 });
  }

  await interaction.deferReply();

  updateTicket(interaction.channelId, { status: 'closed', closedBy: interaction.user.id, closedAt: Date.now() });

  // Remove write access from ticket owner
  await interaction.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false }).catch(() => {});

  const embed = new EmbedBuilder()
    .setTitle('🔒 Ticket Closed')
    .setDescription(
      `This ticket was closed by ${interaction.user}.\n\n` +
      `**${await getMember(interaction, ticket.userId)}**, please rate your support experience below.\n` +
      `⚠️ Rating and comment are **required**.`
    )
    .setColor(0xed4245)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  const ratingRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rating_1').setLabel('⭐ 1').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rating_2').setLabel('⭐⭐ 2').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rating_3').setLabel('⭐⭐⭐ 3').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rating_4').setLabel('⭐⭐⭐⭐ 4').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rating_5').setLabel('⭐⭐⭐⭐⭐ 5').setStyle(ButtonStyle.Success),
  );

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen').setEmoji('🔓').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete Ticket').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
  );

  await interaction.editReply({ embeds: [embed], components: [ratingRow, actionRow] });
  await logEvent(client, interaction.guildId, 'close', { channel: interaction.channel, user: interaction.user, ticket });
}

// ── Ticket Reopen ──────────────────────────────────────────────
async function handleTicketReopen(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ Not a ticket channel.', flags: 64 });

  const settings = getSettings(interaction.guildId);
  if (!isStaff(interaction, settings)) return interaction.reply({ content: '❌ Only staff can reopen tickets.', flags: 64 });

  await interaction.channel.permissionOverwrites.edit(ticket.userId, {
    ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
  }).catch(() => {});

  updateTicket(interaction.channelId, { status: 'open', closedBy: null, closedAt: null });
  await interaction.reply({ content: '🔓 Ticket has been reopened.' });
}

// ── Ticket Delete ──────────────────────────────────────────────
async function handleTicketDelete(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ Not a ticket channel.', flags: 64 });
  if (ticket.status !== 'closed') {
    return interaction.reply({ content: '❌ Close the ticket first before deleting it.', flags: 64 });
  }

  const settings = getSettings(interaction.guildId);
  if (!isStaff(interaction, settings)) return interaction.reply({ content: '❌ Only staff can delete tickets.', flags: 64 });

  await interaction.reply({ content: '🗑️ Deleting ticket in 5 seconds...' });
  await logEvent(client, interaction.guildId, 'delete', { channel: interaction.channel, user: interaction.user, ticket });

  setTimeout(async () => {
    deleteTicketRecord(interaction.channelId);
    await interaction.channel.delete().catch(() => {});
  }, 5000);
}

// ── Claim Ticket ───────────────────────────────────────────────
async function handleTicketClaim(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ Not a ticket channel.', flags: 64 });

  const settings = getSettings(interaction.guildId);
  if (!isStaff(interaction, settings)) return interaction.reply({ content: '❌ Only staff can claim tickets.', flags: 64 });

  if (ticket.claimedBy) {
    return interaction.reply({ content: `❌ Already claimed by <@${ticket.claimedBy}>.`, flags: 64 });
  }

  updateTicket(interaction.channelId, { claimedBy: interaction.user.id });

  await interaction.reply({
    embeds: [new EmbedBuilder().setDescription(`🙋 Ticket claimed by ${interaction.user}`).setColor(0x57f287)]
  });
}

// ── Add User ───────────────────────────────────────────────────
async function handleAddUser(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ Not a ticket channel.', flags: 64 });

  const modal = new ModalBuilder().setCustomId(`modal_adduser_${interaction.channelId}`).setTitle('Add User to Ticket');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('user_id').setLabel('User ID').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Enter user ID...')
    )
  );
  await interaction.showModal(modal);
}

async function handleAddUserModal(interaction, client) {
  const rawInput = interaction.fields.getTextInputValue('user_id').replace(/[<@!>]/g, '').trim();
  try {
    const member = await interaction.guild.members.fetch(rawInput);
    await interaction.channel.permissionOverwrites.edit(member.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true
    });
    await interaction.reply({ content: `✅ ${member} has been added to the ticket.` });
  } catch {
    await interaction.reply({ content: '❌ User not found. Make sure you entered a valid User ID.', flags: 64 });
  }
}

// ── Remove User ────────────────────────────────────────────────
async function handleRemoveUser(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ Not a ticket channel.', flags: 64 });

  const modal = new ModalBuilder().setCustomId(`modal_removeuser_${interaction.channelId}`).setTitle('Remove User from Ticket');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('user_id').setLabel('User ID').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Enter user ID...')
    )
  );
  await interaction.showModal(modal);
}

async function handleRemoveUserModal(interaction, client) {
  const rawInput = interaction.fields.getTextInputValue('user_id').replace(/[<@!>]/g, '').trim();
  try {
    const member = await interaction.guild.members.fetch(rawInput);
    await interaction.channel.permissionOverwrites.delete(member.id);
    await interaction.reply({ content: `✅ ${member} has been removed from the ticket.` });
  } catch {
    await interaction.reply({ content: '❌ User not found.', flags: 64 });
  }
}

// ── Rating ─────────────────────────────────────────────────────
async function handleRating(interaction, client) {
  const stars = parseInt(interaction.customId.replace('rating_', ''));
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ Not a ticket channel.', flags: 64 });
  if (interaction.user.id !== ticket.userId) {
    return interaction.reply({ content: '❌ Only the ticket owner can rate.', flags: 64 });
  }
  if (ticket.rating) {
    return interaction.reply({ content: '❌ You have already rated this ticket.', flags: 64 });
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_rating_${interaction.channelId}_${stars}`)
    .setTitle(`Rate Your Experience — ${stars} ⭐`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('comment')
        .setLabel('Your comment (required)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(5)
        .setPlaceholder('Tell us about your experience...')
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
  if (!ticket) return interaction.reply({ content: '❌ Ticket not found.', flags: 64 });
  if (ticket.rating) return interaction.reply({ content: '❌ Already rated.', flags: 64 });

  updateTicket(interaction.channelId, { rating: stars, ratingComment: comment });

  const settings = getSettings(interaction.guildId);
  if (settings.ratingsChannelId) {
    const ratingsChannel = interaction.guild.channels.cache.get(settings.ratingsChannelId);
    if (ratingsChannel) {
      const starsText = '⭐'.repeat(stars);
      await ratingsChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('📝 New Ticket Rating')
            .addFields(
              { name: '👤 User', value: `<@${ticket.userId}>`, inline: true },
              { name: '⭐ Rating', value: starsText, inline: true },
              { name: '📂 Category', value: ticket.categoryLabel || 'Unknown', inline: true },
              { name: '💬 Comment', value: comment },
              { name: '🙋 Handled by', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Not claimed', inline: true },
              { name: '🎫 Ticket', value: `#${String(ticket.ticketNumber).padStart(4, '0')}`, inline: true },
            )
            .setColor(0xfee75c)
            .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
            .setTimestamp()
        ]
      }).catch(() => {});
    }
  }

  await interaction.reply({
    embeds: [new EmbedBuilder().setDescription(`✅ Thank you for your feedback! You rated ${'⭐'.repeat(stars)}`).setColor(0x57f287)],
    flags: 64
  });
}

// ── Log Event ──────────────────────────────────────────────────
async function logEvent(client, guildId, type, data) {
  const settings = getSettings(guildId);
  if (!settings.logsChannelId) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const logsChannel = guild.channels.cache.get(settings.logsChannelId);
  if (!logsChannel) return;

  const colors = { open: 0x57f287, close: 0xed4245, delete: 0x808080 };
  const icons = { open: '🎫', close: '🔒', delete: '🗑️' };

  await logsChannel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`${icons[type] || '📋'} Ticket ${type.charAt(0).toUpperCase() + type.slice(1)}`)
        .addFields(
          { name: '📌 Channel', value: data.channel ? `#${data.channel.name}` : 'Unknown', inline: true },
          { name: '👤 User', value: data.user ? `${data.user}` : 'Unknown', inline: true },
          { name: '📂 Category', value: data.ticket?.categoryLabel || 'Unknown', inline: true },
          { name: '🎫 Ticket #', value: String(data.ticket?.ticketNumber || '?').padStart(4, '0'), inline: true },
        )
        .setColor(colors[type] || 0x5865f2)
        .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
        .setTimestamp()
    ]
  }).catch(() => {});
}

// ── Util ───────────────────────────────────────────────────────
async function getMember(interaction, userId) {
  try {
    const m = await interaction.guild.members.fetch(userId);
    return `${m}`;
  } catch {
    return `<@${userId}>`;
  }
}
