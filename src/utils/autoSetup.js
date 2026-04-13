const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getSettings, updateSettings } = require('./guildSettings');
const { ICON_URL, BANNER_URL } = require('./ticketManager');

const MAIN_GUILD_ID = '1265834107783483404';
const MAIN_CATEGORY_ID = '1492635837718986942';
const LOGS_CHANNEL_ID = '1492996007762596061';
const RATINGS_CHANNEL_ID = '1492996586647584808';
const STAFF_ROLE_ID = '1492994348239949996';

const DEFAULT_CATEGORIES = [
  { id: 'buy',        label: 'شراء سكريبت',    emoji: '🛒', description: 'Buy a script or service' },
  { id: 'support',    label: 'دعم تقني',         emoji: '🔧', description: 'Technical support & help' },
  { id: 'bug',        label: 'بلاغ مشكلة',       emoji: '🐛', description: 'Report a bug or issue' },
  { id: 'partnership',label: 'شراكة',             emoji: '🤝', description: 'Partnership requests' },
  { id: 'suggestion', label: 'اقتراح',            emoji: '💡', description: 'Suggestions and ideas' },
  { id: 'other',      label: 'أخرى',              emoji: '📌', description: 'Other requests' },
];

module.exports = async function autoSetup(client) {
  const guild = client.guilds.cache.get(MAIN_GUILD_ID);
  if (!guild) return console.warn('⚠️ Main guild not found for auto-setup');

  // Always apply main guild settings on startup
  const settings = updateSettings(MAIN_GUILD_ID, {
    categories: DEFAULT_CATEGORIES,
    logsChannelId: LOGS_CHANNEL_ID,
    ratingsChannelId: RATINGS_CHANNEL_ID,
    categoryId: MAIN_CATEGORY_ID,
    staffRoleIds: [STAFF_ROLE_ID],
  });

  // Clear old panel so it re-sends
  const fresh = getSettings(MAIN_GUILD_ID);

  try {
    const ticketsChannel =
      guild.channels.cache.find(c => c.parentId === MAIN_CATEGORY_ID && c.name.toLowerCase().includes('ticket')) ||
      guild.channels.cache.find(c => c.parentId === MAIN_CATEGORY_ID);

    if (!ticketsChannel) {
      return console.warn('⚠️ No channel found in ticket category — run /setup-tickets manually');
    }

    await sendTicketPanel(ticketsChannel, settings, MAIN_GUILD_ID);
    console.log('✅ Ticket panel sent to main guild');
  } catch (err) {
    console.error('❌ Auto-setup error:', err.message);
  }
};

async function sendTicketPanel(channel, settings, guildId) {
  const categories = (settings.categories && settings.categories.length)
    ? settings.categories
    : DEFAULT_CATEGORIES;

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
module.exports.DEFAULT_CATEGORIES = DEFAULT_CATEGORIES;
