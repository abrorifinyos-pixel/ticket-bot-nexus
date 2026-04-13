const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const { getSettings, updateSettings } = require('./guildSettings');
const { ICON_URL, BANNER_URL } = require('./ticketManager');

const MAIN_GUILD_ID = '1265834107783483404';
const MAIN_CATEGORY_ID = '1492635837718986942';
const LOGS_CHANNEL_ID = '1492996007762596061';
const RATINGS_CHANNEL_ID = '1492996586647584808';
const STAFF_ROLE_ID = '1492994348239949996';

const DEFAULT_CATEGORIES = [
  { id: 'general', label: 'General Support', emoji: '🎫', description: 'General inquiries and support' },
  { id: 'bug', label: 'Bug Report', emoji: '🐛', description: 'Report a bug or issue' },
  { id: 'purchase', label: 'Purchase', emoji: '💳', description: 'Purchasing scripts or services' },
  { id: 'partnership', label: 'Partnership', emoji: '🤝', description: 'Partnership requests' },
  { id: 'other', label: 'Other', emoji: '📌', description: 'Other requests' },
];

module.exports = async function autoSetup(client) {
  const guild = client.guilds.cache.get(MAIN_GUILD_ID);
  if (!guild) return console.warn('⚠️ Main guild not found for auto-setup');

  let settings = getSettings(MAIN_GUILD_ID);

  if (!settings.categories || settings.categories.length === 0) {
    settings = updateSettings(MAIN_GUILD_ID, {
      categories: DEFAULT_CATEGORIES,
      logsChannelId: LOGS_CHANNEL_ID,
      ratingsChannelId: RATINGS_CHANNEL_ID,
      categoryId: MAIN_CATEGORY_ID,
      staffRoleIds: [STAFF_ROLE_ID],
    });
  }

  if (settings.ticketPanelMessageId) return;

  try {
    const ticketsChannel = guild.channels.cache.find(
      c => c.parentId === MAIN_CATEGORY_ID && c.name.includes('ticket')
    ) || guild.channels.cache.find(c => c.parentId === MAIN_CATEGORY_ID);

    if (!ticketsChannel) {
      console.warn('⚠️ No channel found in ticket category for panel');
      return;
    }

    await sendTicketPanel(ticketsChannel, settings, MAIN_GUILD_ID);
    console.log('✅ Ticket panel sent to main guild');
  } catch (err) {
    console.error('❌ Auto-setup error:', err.message);
  }
};

async function sendTicketPanel(channel, settings, guildId) {
  const categories = settings.categories || DEFAULT_CATEGORIES;

  const embed = new EmbedBuilder()
    .setTitle('𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭 - Ticketing System')
    .setDescription(
      'Welcome to the support system 👋\n' +
      'Through this system, you can contact the team to resolve your issue or request a service.\n\n' +
      'Choose the appropriate section from the list below.\n\n' +
      '⚠️ **Important Notes:**\n' +
      '• Choose the appropriate section\n' +
      '• Be clear\n' +
      '• Do not open ticket without reason\n' +
      '• Do not tag management'
    )
    .setColor(0x2b2d31)
    .setThumbnail(ICON_URL)
    .setImage(BANNER_URL)
    .setFooter({ text: '𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭', iconURL: ICON_URL });

  const options = categories.map(cat => ({
    label: cat.label,
    value: cat.id,
    emoji: cat.emoji,
    description: cat.description || '',
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_create')
    .setPlaceholder('Choose a category to open a ticket...')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(menu);

  const msg = await channel.send({ embeds: [embed], components: [row] });

  updateSettings(guildId, {
    ticketPanelMessageId: msg.id,
    ticketPanelChannelId: channel.id,
  });

  return msg;
}

module.exports.sendTicketPanel = sendTicketPanel;
