const { SlashCommandBuilder } = require('discord.js');
const { getTicket, updateTicket, ICON_URL } = require('../utils/ticketManager');
const { getSettings } = require('../utils/guildSettings');
const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('إغلاق التذكرة الحالية'),

  async execute(interaction, client) {
    const ticket = getTicket(interaction.channelId);
    if (!ticket) return interaction.reply({ content: '❌ هذه القناة ليست تذكرة.', flags: 64 });
    if (ticket.status === 'closed') return interaction.reply({ content: '❌ التذكرة مغلقة بالفعل.', flags: 64 });

    const settings = getSettings(interaction.guildId);
    const isStaff = (settings.staffRoleIds || []).some(r => interaction.member.roles.cache.has(r));
    if (!isStaff && interaction.user.id !== ticket.userId) {
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
  }
};
