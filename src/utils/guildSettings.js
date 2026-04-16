const { readJSON, writeJSON } = require('./database');

const LOG_TYPES = [
  'memberJoin', 'memberLeave', 'memberBan', 'memberUnban',
  'memberTimeout', 'memberNickname', 'memberRoleAdd', 'memberRoleRemove',
  'roleCreate', 'roleDelete', 'roleUpdate',
  'messageDelete', 'messageDeleteBulk', 'messageUpdate',
  'channelCreate', 'channelDelete', 'channelUpdate', 'channelPermUpdate',
  'threadCreate', 'threadDelete', 'threadUpdate',
  'voiceJoin', 'voiceLeave', 'voiceMove', 'voiceMute', 'voiceDeafen',
  'serverUpdate', 'inviteCreate', 'inviteDelete',
];

const DEFAULTS = {
  // Ticket system
  categories: [],
  logsChannelId: null,
  ratingsChannelId: null,
  categoryId: null,
  staffRoleIds: [],
  ticketCounter: 0,
  // Logging system
  logSettings: {},
};

function getSettings(guildId) {
  const all = readJSON('settings');
  return all[guildId] ? { ...DEFAULTS, ...all[guildId] } : { ...DEFAULTS };
}

function saveSettings(guildId, settings) {
  const all = readJSON('settings');
  all[guildId] = settings;
  writeJSON('settings', all);
}

function updateSettings(guildId, patch) {
  const current = getSettings(guildId);
  const updated = { ...current, ...patch };
  saveSettings(guildId, updated);
  return updated;
}

function getLogChannel(guildId, logType) {
  const settings = getSettings(guildId);
  const log = (settings.logSettings || {})[logType];
  if (!log || !log.enabled || !log.channelId) return null;
  return log.channelId;
}

function setLogSetting(guildId, logType, channelId, enabled = true) {
  const settings = getSettings(guildId);
  const logSettings = settings.logSettings || {};
  logSettings[logType] = { channelId, enabled };
  updateSettings(guildId, { logSettings });
}

function toggleLog(guildId, logType) {
  const settings = getSettings(guildId);
  const logSettings = settings.logSettings || {};
  const cur = logSettings[logType] || { channelId: null, enabled: false };
  logSettings[logType] = { ...cur, enabled: !cur.enabled };
  updateSettings(guildId, { logSettings });
  return logSettings[logType].enabled;
}

module.exports = { getSettings, saveSettings, updateSettings, getLogChannel, setLogSetting, toggleLog, LOG_TYPES };
