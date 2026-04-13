const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits,
  ChannelType
} = require('discord.js');
const { getSettings } = require('../utils/guildSettings');
const {
  ICON_URL, BANNER_URL,
  getTicket, createTicketRecord, updateTicket, deleteTicketRecord, nextTicketNumber
} = require('../utils/ticketManager');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

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

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_create') {
      await handleTicketCreate(interaction, client);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'ticket_close') await handleTicketClose(interaction, client);
      else if (interaction.customId === 'ticket_claim') await handleTicketClaim(interaction, client);
      else if (interaction.customId === 'ticket_adduser') await handleAddUser(interaction, client);
      else if (interaction.customId === 'ticket_removeuser') await handleRemoveUser(interaction, client);
      else if (interaction.customId === 'ticket_delete') await handleTicketDelete(interaction, client);
      else if (interaction.customId === 'ticket_reopen') await handleTicketReopen(interaction, client);
      else if (interaction.customId.startsWith('rating_')) await handleRating(interaction, client);
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('modal_adduser_')) await handleAddUserModal(interaction, client);
      else if (interaction.customId.startsWith('modal_removeuser_')) await handleRemoveUserModal(interaction, client);
      else if (interaction.customId.startsWith('modal_rating_')) await handleRatingModal(interaction, client);
    }
  }
};

function isStaff(interaction, settings) {
  return (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r));
}

// ── فتح تذكرة ─────────────────────────────────────────────────
async function handleTicketCreate(interaction, client) {
  await interaction.deferReply({ flags: 64 });

  const settings = getSettings(interaction.guildId);
  const categoryId = interaction.values[0];
  const category = (settings.categories || []).find(c => c.id === categoryId);

  if (!category) return interaction.editReply({ content: '❌ القسم غير موجود.' });

  const existing = interaction.guild.channels.cache.find(
    ch => ch.topic && ch.topic.includes(`user:${interaction.user.id}:open`)
  );
  if (existing) return interaction.editReply({ content: `❌ لديك تذكرة مفتوحة بالفعل: ${existing}` });

  const ticketNum = nextTicketNumber(interaction.guildId);
  const catSlug = category.id.replace(/[^a-z0-9]/gi, '-');
  const channelName = `${catSlug}-${String(ticketNum).padStart(4, '0')}`;

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
    console.error('فشل إنشاء قناة التذكرة:', err);
    return interaction.editReply({ content: '❌ فشل إنشاء قناة التذكرة. تأكد من صلاحيات البوت.' });
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
    .setTitle(`${category.emoji || '🎫'} ${category.label} | تذكرة رقم #${String(ticketNum).padStart(4, '0')}`)
    .setDescription(
      `مرحباً ${interaction.user}! 👋\n\n` +
      `**القسم:** ${category.emoji || '🎫'} ${category.label}\n` +
      `**الحالة:** 🟢 مفتوحة\n\n` +
      `اشرح مشكلتك بوضوح وسيقوم فريقنا بمساعدتك في أقرب وقت.\n\n` +
      `> ⚠️ لا تقم بمنشن الإدارة — سيتم الرد عليك بأقرب وقت.`
    )
    .setColor(0x5865f2)
    .setThumbnail(ICON_URL)
    .setImage(BANNER_URL)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
    .setTimestamp();

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('إغلاق').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('استلام').setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_adduser').setLabel('إضافة عضو').setEmoji('➕').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_removeuser').setLabel('إزالة عضو').setEmoji('➖').setStyle(ButtonStyle.Secondary),
  );

  await channel.send({
    content: `${interaction.user} ${staffRoles.map(r => `<@&${r}>`).join(' ')}`,
    embeds: [embed],
    components: [buttons]
  });

  await logEvent(client, interaction.guildId, 'open', { channel, user: interaction.user, ticket: { categoryLabel: category.label, ticketNumber: ticketNum } });
  await interaction.editReply({ content: `✅ تم فتح تذكرتك بنجاح: ${channel}` });
}

// ── إغلاق تذكرة ───────────────────────────────────────────────
async function handleTicketClose(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });
  if (ticket.status === 'closed') return interaction.reply({ content: '❌ التذكرة مغلقة بالفعل.', flags: 64 });

  const settings = getSettings(interaction.guildId);
  if (!isStaff(interaction, settings) && interaction.user.id !== ticket.userId) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية لإغلاق هذه التذكرة.', flags: 64 });
  }

  await interaction.deferReply();
  updateTicket(interaction.channelId, { status: 'closed', closedBy: interaction.user.id, closedAt: Date.now() });
  await interaction.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false }).catch(() => {});

  const embed = new EmbedBuilder()
    .setTitle('🔒 تم إغلاق التذكرة')
    .setDescription(
      `تم إغلاق التذكرة بواسطة ${interaction.user}\n\n` +
      `**<@${ticket.userId}>** يرجى تقييم تجربتك مع الدعم.\n` +
      `⚠️ التقييم والتعليق **إجباريان**.`
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
    new ButtonBuilder().setCustomId('ticket_reopen').setLabel('إعادة فتح').setEmoji('🔓').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_delete').setLabel('حذف التذكرة').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
  );

  await interaction.editReply({ embeds: [embed], components: [ratingRow, actionRow] });
  await logEvent(client, interaction.guildId, 'close', { channel: interaction.channel, user: interaction.user, ticket });
}

// ── إعادة فتح ─────────────────────────────────────────────────
async function handleTicketReopen(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });

  const settings = getSettings(interaction.guildId);
  if (!isStaff(interaction, settings)) return interaction.reply({ content: '❌ فقط الستاف يمكنهم إعادة فتح التذاكر.', flags: 64 });

  await interaction.channel.permissionOverwrites.edit(ticket.userId, {
    ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
  }).catch(() => {});

  updateTicket(interaction.channelId, { status: 'open', closedBy: null, closedAt: null });
  await interaction.reply({ content: '🔓 تم إعادة فتح التذكرة.' });
}

// ── حذف تذكرة ─────────────────────────────────────────────────
async function handleTicketDelete(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });
  if (ticket.status !== 'closed') {
    return interaction.reply({ content: '❌ يجب إغلاق التذكرة أولاً قبل حذفها.', flags: 64 });
  }

  const settings = getSettings(interaction.guildId);
  if (!isStaff(interaction, settings)) return interaction.reply({ content: '❌ فقط الستاف يمكنهم حذف التذاكر.', flags: 64 });

  await interaction.reply({ content: '🗑️ سيتم حذف التذكرة خلال 5 ثوانٍ...' });
  await logEvent(client, interaction.guildId, 'delete', { channel: interaction.channel, user: interaction.user, ticket });

  setTimeout(async () => {
    deleteTicketRecord(interaction.channelId);
    await interaction.channel.delete().catch(() => {});
  }, 5000);
}

// ── استلام تذكرة ──────────────────────────────────────────────
async function handleTicketClaim(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });

  const settings = getSettings(interaction.guildId);
  if (!isStaff(interaction, settings)) return interaction.reply({ content: '❌ فقط الستاف يمكنهم استلام التذاكر.', flags: 64 });

  if (ticket.claimedBy) {
    return interaction.reply({ content: `❌ التذكرة مستلَمة بالفعل من قِبَل <@${ticket.claimedBy}>.`, flags: 64 });
  }

  updateTicket(interaction.channelId, { claimedBy: interaction.user.id });
  await interaction.reply({
    embeds: [new EmbedBuilder().setDescription(`🙋 تم استلام التذكرة بواسطة ${interaction.user}`).setColor(0x57f287)]
  });
}

// ── إضافة عضو ─────────────────────────────────────────────────
async function handleAddUser(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });

  const modal = new ModalBuilder()
    .setCustomId(`modal_adduser_${interaction.channelId}`)
    .setTitle('إضافة عضو إلى التذكرة');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('user_id').setLabel('معرّف المستخدم (ID)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('أدخل ID المستخدم...')
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
    await interaction.reply({ content: `✅ تم إضافة ${member} إلى التذكرة.` });
  } catch {
    await interaction.reply({ content: '❌ المستخدم غير موجود. تأكد من إدخال ID صحيح.', flags: 64 });
  }
}

// ── إزالة عضو ─────────────────────────────────────────────────
async function handleRemoveUser(interaction, client) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });

  const modal = new ModalBuilder()
    .setCustomId(`modal_removeuser_${interaction.channelId}`)
    .setTitle('إزالة عضو من التذكرة');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('user_id').setLabel('معرّف المستخدم (ID)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('أدخل ID المستخدم...')
    )
  );
  await interaction.showModal(modal);
}

async function handleRemoveUserModal(interaction, client) {
  const rawInput = interaction.fields.getTextInputValue('user_id').replace(/[<@!>]/g, '').trim();
  try {
    const member = await interaction.guild.members.fetch(rawInput);
    await interaction.channel.permissionOverwrites.delete(member.id);
    await interaction.reply({ content: `✅ تم إزالة ${member} من التذكرة.` });
  } catch {
    await interaction.reply({ content: '❌ المستخدم غير موجود.', flags: 64 });
  }
}

// ── التقييم ───────────────────────────────────────────────────
async function handleRating(interaction, client) {
  const stars = parseInt(interaction.customId.replace('rating_', ''));
  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });
  if (interaction.user.id !== ticket.userId) {
    return interaction.reply({ content: '❌ فقط صاحب التذكرة يمكنه التقييم.', flags: 64 });
  }
  if (ticket.rating) {
    return interaction.reply({ content: '❌ لقد قمت بتقييم هذه التذكرة مسبقاً.', flags: 64 });
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_rating_${interaction.channelId}_${stars}`)
    .setTitle(`تقييم التجربة — ${stars} ⭐`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('comment')
        .setLabel('تعليقك (إجباري)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(5)
        .setPlaceholder('شاركنا تجربتك...')
    )
  );
  await interaction.showModal(modal);
}

async function handleRatingModal(interaction, client) {
  const parts = interaction.customId.split('_');
  const stars = parseInt(parts[3]);
  const comment = interaction.fields.getTextInputValue('comment');

  const ticket = getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ التذكرة غير موجودة.', flags: 64 });
  if (ticket.rating) return interaction.reply({ content: '❌ تم التقييم مسبقاً.', flags: 64 });

  updateTicket(interaction.channelId, { rating: stars, ratingComment: comment });

  const settings = getSettings(interaction.guildId);
  if (settings.ratingsChannelId) {
    const ratingsChannel = interaction.guild.channels.cache.get(settings.ratingsChannelId);
    if (ratingsChannel) {
      await ratingsChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('📝 تقييم جديد')
            .addFields(
              { name: '👤 المستخدم', value: `<@${ticket.userId}>`, inline: true },
              { name: '⭐ التقييم', value: '⭐'.repeat(stars), inline: true },
              { name: '📂 القسم', value: ticket.categoryLabel || 'غير معروف', inline: true },
              { name: '💬 التعليق', value: comment },
              { name: '🙋 المستلِم', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'لم يُستلم', inline: true },
              { name: '🎫 رقم التذكرة', value: `#${String(ticket.ticketNumber).padStart(4, '0')}`, inline: true },
            )
            .setColor(0xfee75c)
            .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
            .setTimestamp()
        ]
      }).catch(() => {});
    }
  }

  await interaction.reply({
    embeds: [new EmbedBuilder().setDescription(`✅ شكراً على تقييمك! منحتنا ${'⭐'.repeat(stars)}`).setColor(0x57f287)],
    flags: 64
  });
}

// ── اللوغات ───────────────────────────────────────────────────
async function logEvent(client, guildId, type, data) {
  const settings = getSettings(guildId);
  if (!settings.logsChannelId) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const logsChannel = guild.channels.cache.get(settings.logsChannelId);
  if (!logsChannel) return;

  const colors = { open: 0x57f287, close: 0xed4245, delete: 0x808080 };
  const icons = { open: '🎫', close: '🔒', delete: '🗑️' };
  const labels = { open: 'فتح', close: 'إغلاق', delete: 'حذف' };

  await logsChannel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`${icons[type] || '📋'} تذكرة — ${labels[type] || type}`)
        .addFields(
          { name: '📌 القناة', value: data.channel ? `#${data.channel.name}` : 'غير معروف', inline: true },
          { name: '👤 المستخدم', value: data.user ? `${data.user}` : 'غير معروف', inline: true },
          { name: '📂 القسم', value: data.ticket?.categoryLabel || 'غير معروف', inline: true },
          { name: '🎫 رقم التذكرة', value: `#${String(data.ticket?.ticketNumber || '0').padStart(4, '0')}`, inline: true },
        )
        .setColor(colors[type] || 0x5865f2)
        .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL })
        .setTimestamp()
    ]
  }).catch(() => {});
}
