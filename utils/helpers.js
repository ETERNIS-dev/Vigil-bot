const Guild = require('../database/models/Guild');
const Case = require('../database/models/Case');
const AutomodConfig = require('../database/models/AutomodConfig');
const ImmuneRole = require('../database/models/ImmuneRole');
const { modEmbed } = require('./embedBuilder');

const automodCache = new Map();

async function getGuild(guildId) {
  let guild = await Guild.findOne({ guildId });
  if (!guild) guild = await Guild.create({ guildId });
  return guild;
}

async function getAutomod(guildId) {
  const cached = automodCache.get(guildId);
  if (cached && Date.now() - cached.timestamp < 60000) return cached.config;
  let config = await AutomodConfig.findOne({ guildId });
  if (!config) config = await AutomodConfig.create({ guildId });
  automodCache.set(guildId, { config, timestamp: Date.now() });
  return config;
}

function invalidateAutomodCache(guildId) {
  automodCache.delete(guildId);
}

async function createCase(client, { guildId, type, userId, userTag, moderatorId, moderatorTag, reason, duration, expiresAt }) {
  const caseNumber = await Case.nextCaseNumber(guildId);
  const newCase = await Case.create({
    guildId, caseNumber, type, userId, userTag,
    moderatorId, moderatorTag, reason, duration, expiresAt,
  });
  try {
    const guildSettings = await getGuild(guildId);
    if (guildSettings.modLogChannel) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const channel = guild.channels.cache.get(guildSettings.modLogChannel);
        if (channel) {
          const user = await client.users.fetch(userId).catch(() => ({ tag: userTag, id: userId, displayAvatarURL: () => null }));
          const mod = await client.users.fetch(moderatorId).catch(() => ({ tag: moderatorTag, id: moderatorId }));
          await channel.send({ embeds: [modEmbed({ type, user, moderator: mod, reason: reason || 'No reason provided.', duration, caseNumber })] });
        }
      }
    }
  } catch (_) { /* silent */ }
  return newCase;
}

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(s|m|h|d|w)$/i);
  if (!match) return null;
  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return amount * (units[unit] || 0);
}

async function resolveMember(guild, input) {
  if (!input) return null;
  const id = input.replace(/[<@!>]/g, '');
  try { return await guild.members.fetch(id); } catch { return null; }
}

function canModerate(authorMember, target, botMember) {
  if (!target) return false;
  if (target.id === authorMember.id) return false;
  if (target.id === authorMember.guild.ownerId) return false;
  if (target.id === botMember.id) return false;
  if (target.roles.highest.position >= authorMember.roles.highest.position) return false;
  if (target.roles.highest.position >= botMember.roles.highest.position) return false;
  return true;
}

function resolveVariables(text, data) {
  if (!text) return text;
  return text
    .replace(/\{user\}/g, data.user ? `<@${data.user.id}>` : '')
    .replace(/\{username\}/g, data.user?.username || data.username || '')
    .replace(/\{tag\}/g, data.user?.tag || data.tag || '')
    .replace(/\{server\}/g, data.guild?.name || data.server || '')
    .replace(/\{memberCount\}/g, String(data.guild?.memberCount ?? data.memberCount ?? ''))
    .replace(/\{boostCount\}/g, String(data.guild?.premiumSubscriptionCount ?? data.boostCount ?? '0'))
    .replace(/\{roleAdded\}/g, data.roleAdded || '')
    .replace(/\{roleRemoved\}/g, data.roleRemoved || '')
    .replace(/\{inviter\}/g, data.inviter || 'Unknown');
}

async function isImmune(member, guildId) {
  const immuneRoles = await ImmuneRole.find({ guildId });
  if (!immuneRoles.length) return false;
  const immuneIds = new Set(immuneRoles.map(r => r.roleId));
  return member.roles.cache.some(role => immuneIds.has(role.id));
}

async function checkWarnThresholds(client, member, guildId) {
  try {
    const guildSettings = await getGuild(guildId);
    if (!guildSettings.warnThresholds?.length) return;
    for (const threshold of guildSettings.warnThresholds) {
      const since = new Date(Date.now() - threshold.timeWindowDays * 86400000);
      const count = await Case.countDocuments({
        guildId,
        userId: member.id,
        $or: [{ type: 'WARN' }, { type: { $regex: /^AUTOMOD_/ } }],
        createdAt: { $gte: since },
      });
      if (count >= threshold.warnCount) {
        const reason = `Warn threshold reached: ${count} warnings in ${threshold.timeWindowDays} days`;
        if (threshold.punishment === 'mute' && threshold.muteDuration) {
          const ms = parseDuration(threshold.muteDuration);
          if (ms) {
            await member.timeout(ms, reason);
            await createCase(client, { guildId, type: 'MUTE', userId: member.id, userTag: member.user.tag, moderatorId: client.user.id, moderatorTag: client.user.tag, reason, duration: threshold.muteDuration, expiresAt: new Date(Date.now() + ms) });
          }
        } else if (threshold.punishment === 'kick') {
          await member.kick(reason);
          await createCase(client, { guildId, type: 'KICK', userId: member.id, userTag: member.user.tag, moderatorId: client.user.id, moderatorTag: client.user.tag, reason });
        } else if (threshold.punishment === 'ban') {
          await member.ban({ reason });
          await createCase(client, { guildId, type: 'BAN', userId: member.id, userTag: member.user.tag, moderatorId: client.user.id, moderatorTag: client.user.tag, reason });
        }
        break;
      }
    }
  } catch (_) { /* silent */ }
}

async function expandReason(guildId, reason) {
  if (!reason) return reason;
  const guildSettings = await getGuild(guildId);
  const alias = guildSettings.reasonAliases?.get(reason);
  return alias || reason;
}

async function sendWelcomeMessages(client, member, type, extraData = {}) {
  const WelcomeMessage = require('../database/models/WelcomeMessage');
  try {
    const messages = await WelcomeMessage.find({ guildId: member.guild.id, type, enabled: true });
    for (const msg of messages) {
      try {
        const channel = member.guild.channels.cache.get(msg.channelId);
        if (!channel) continue;
        const data = { user: member.user, guild: member.guild, ...extraData };
        let pingText = msg.pingUser ? `<@${member.id}> ` : '';
        if (msg.embed.useEmbed) {
          const { EmbedBuilder } = require('discord.js');
          const embed = new EmbedBuilder().setColor(msg.embed.color || '#5865F2');
          if (msg.embed.title) embed.setTitle(resolveVariables(msg.embed.title, data));
          if (msg.embed.description) embed.setDescription(resolveVariables(msg.embed.description, data));
          if (msg.embed.thumbnail && member.user.displayAvatarURL) embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
          if (msg.embed.footer) embed.setFooter({ text: resolveVariables(msg.embed.footer, data) });
          if (msg.embed.image) embed.setImage(msg.embed.image);
          if (msg.embed.fields?.length) {
            embed.addFields(msg.embed.fields.map(f => ({
              name: resolveVariables(f.name, data),
              value: resolveVariables(f.value, data),
              inline: f.inline,
            })));
          }
          embed.setTimestamp();
          await channel.send({ content: pingText || undefined, embeds: [embed] });
        } else {
          const text = resolveVariables(msg.plainMessage || '', data);
          await channel.send(pingText + text);
        }
      } catch (_) { /* silent per-message errors */ }
    }
  } catch (_) { /* silent */ }
}

module.exports = {
  getGuild,
  getAutomod,
  invalidateAutomodCache,
  createCase,
  parseDuration,
  resolveMember,
  canModerate,
  resolveVariables,
  isImmune,
  checkWarnThresholds,
  expandReason,
  sendWelcomeMessages,
};
