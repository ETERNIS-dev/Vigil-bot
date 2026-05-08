const { PermissionFlagsBits } = require('discord.js');
const { getAutomod, isImmune, createCase, parseDuration, checkWarnThresholds, sendPunishmentDM } = require('../utils/helpers');
const { EmbedBuilder } = require('discord.js');

const spamMap = new Map();
const channelSpamMap = new Map();
const mentionsMap = new Map();
const attachmentsMap = new Map();
const emojisMap = new Map();
const msgLinesMap = new Map();

function trackEntry(map, key, timeWindow, initialValue) {
  if (map.has(key)) return map.get(key);
  const entry = { ...initialValue };
  map.set(key, entry);
  entry.timeout = setTimeout(() => map.delete(key), timeWindow * 1000);
  return entry;
}

async function deleteUserMessagesInWindow(message, timeWindow) {
  try {
    const cutoff = Date.now() - timeWindow * 1000;
    const fetched = await message.channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!fetched) return;
    const toDelete = fetched.filter(
      m => m.author.id === message.author.id && m.createdTimestamp >= cutoff
    );
    if (toDelete.size === 0) return;
    if (toDelete.size === 1) {
      await toDelete.first().delete().catch(() => {});
    } else {
      const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const bulkable = toDelete.filter(m => m.createdTimestamp > fourteenDaysAgo);
      if (bulkable.size > 1) {
        await message.channel.bulkDelete(bulkable, true).catch(() => {});
      } else if (bulkable.size === 1) {
        await bulkable.first().delete().catch(() => {});
      }
    }
  } catch (_) { /* silent */ }
}

async function applyPunishments(client, message, punishments, timeWindow, type, reason) {
  const guildId = message.guild.id;
  const member = message.member;
  if (!member) return;

  const sorted = [...punishments].sort((a, b) => {
    const order = { delete_all: 0, dm_user: 1, warn: 2, mute: 3, kick: 4, ban: 5, report_to_mods: 6 };
    return (order[a.type] ?? 99) - (order[b.type] ?? 99);
  });

  let warnRan = false;
  for (const p of sorted) {
    try {
      if (p.type === 'delete_all') {
        await deleteUserMessagesInWindow(message, timeWindow || 30);
      } else if (p.type === 'dm_user') {
        await member.user.send(
          `⚠️ You triggered automod in **${message.guild.name}**.\n**Rule:** ${type}\n**Action taken:** ${sorted.filter(x => x.type !== 'dm_user' && x.type !== 'report_to_mods').map(x => x.type).join(', ') || 'none'}\n**Reason:** ${reason}`
        ).catch(() => {});
      } else if (p.type === 'warn') {
        await createCase(client, {
          guildId, type, userId: member.id, userTag: member.user.tag,
          moderatorId: client.user.id, moderatorTag: client.user.tag, reason,
        });
        await member.user.send(`⚠️ You have been warned in **${message.guild.name}**: ${reason}`).catch(() => {});
        warnRan = true;
      } else if (p.type === 'mute') {
        const ms = parseDuration(p.muteDuration) || 600000;
        await member.timeout(ms, reason);
        await createCase(client, {
          guildId, type, userId: member.id, userTag: member.user.tag,
          moderatorId: client.user.id, moderatorTag: client.user.tag,
          reason, duration: p.muteDuration, expiresAt: new Date(Date.now() + ms),
        });
        await member.user.send(`🔇 You have been muted in **${message.guild.name}** for ${p.muteDuration}: ${reason}`).catch(() => {});
      } else if (p.type === 'kick') {
        await member.user.send(`👢 You have been kicked from **${message.guild.name}**: ${reason}`).catch(() => {});
        await member.kick(reason);
        await createCase(client, {
          guildId, type, userId: member.id, userTag: member.user.tag,
          moderatorId: client.user.id, moderatorTag: client.user.tag, reason,
        });
      } else if (p.type === 'ban') {
        await member.user.send(`🔨 You have been banned from **${message.guild.name}**: ${reason}`).catch(() => {});
        await message.guild.members.ban(member.id, { reason });
        await createCase(client, {
          guildId, type, userId: member.id, userTag: member.user.tag,
          moderatorId: client.user.id, moderatorTag: client.user.tag, reason,
        });
      } else if (p.type === 'report_to_mods') {
        // handled below via sendAlert
      }
    } catch (_) { /* silent */ }
  }
  if (warnRan) {
    await checkWarnThresholds(client, member, guildId).catch(() => {});
  }
}

async function sendAlert(guild, alertChannelId, alertMessage, vars) {
  if (!alertChannelId) return;
  try {
    const ch = guild.channels.cache.get(alertChannelId);
    if (!ch) return;
    let text = alertMessage || '';
    for (const [k, v] of Object.entries(vars)) text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    const embed = new EmbedBuilder().setColor(0xf39c12).setDescription(text).setTimestamp();
    await ch.send({ embeds: [embed] });
  } catch (_) { /* silent */ }
}

function getDefaultPunishments(rule) {
  const p = rule.punishments;
  if (p && p.length > 0) return p;
  return [{ type: 'delete_all' }];
}

module.exports = async function runAutomod(client, message) {
  if (!message.guild || message.author.bot) return false;
  if (!message.member) return false;
  if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
  if (await isImmune(message.member, message.guild.id)) return false;

  const config = await getAutomod(message.guild.id);
  if (!config) return false;

  const guildId = message.guild.id;
  const userId = message.author.id;
  const key = `${guildId}-${userId}`;
  let blocked = false;

  // SPAM
  const spam = config.rules?.spam;
  if (spam?.enabled) {
    const entry = trackEntry(spamMap, key, spam.timeWindow, { count: 0, timeout: null });
    entry.count++;
    if (entry.count >= spam.maxMessages) {
      spamMap.delete(key);
      clearTimeout(entry.timeout);
      const reason = `Automod: Spam (${entry.count} messages in ${spam.timeWindow}s)`;
      const punishments = getDefaultPunishments(spam);
      await applyPunishments(client, message, punishments, spam.timeWindow, 'AUTOMOD_SPAM', reason);
      await sendAlert(message.guild, spam.alertChannel, spam.alertMessage, { user: `<@${userId}>`, count: entry.count, limit: spam.maxMessages, channel: message.channel.name, rule: 'spam' });
      blocked = true;
    }
  }

  // CHANNEL SPAM
  const channelSpam = config.rules?.channelSpam;
  if (!blocked && channelSpam?.enabled) {
    const entry = trackEntry(channelSpamMap, key, channelSpam.timeWindow, { channels: new Set(), timeout: null });
    entry.channels.add(message.channel.id);
    if (entry.channels.size >= channelSpam.maxChannels) {
      channelSpamMap.delete(key);
      clearTimeout(entry.timeout);
      const reason = `Automod: Channel spam (${entry.channels.size} channels in ${channelSpam.timeWindow}s)`;
      const punishments = getDefaultPunishments(channelSpam);
      await applyPunishments(client, message, punishments, channelSpam.timeWindow, 'AUTOMOD_CHANNELSPAM', reason);
      await sendAlert(message.guild, channelSpam.alertChannel, channelSpam.alertMessage, { user: `<@${userId}>`, count: entry.channels.size, limit: channelSpam.maxChannels, channel: message.channel.name, rule: 'channelspam' });
      blocked = true;
    }
  }

  // MENTIONS
  const mentions = config.rules?.mentions;
  if (!blocked && mentions?.enabled) {
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    if (mentionCount > 0) {
      const entry = trackEntry(mentionsMap, key, mentions.timeWindow, { count: 0, timeout: null });
      entry.count += mentionCount;
      if (entry.count >= mentions.maxMentions) {
        mentionsMap.delete(key);
        clearTimeout(entry.timeout);
        const reason = `Automod: Too many mentions (${entry.count} in ${mentions.timeWindow}s)`;
        const punishments = getDefaultPunishments(mentions);
        await applyPunishments(client, message, punishments, mentions.timeWindow, 'AUTOMOD_MENTIONS', reason);
        await sendAlert(message.guild, mentions.alertChannel, mentions.alertMessage, { user: `<@${userId}>`, count: entry.count, limit: mentions.maxMentions, channel: message.channel.name, rule: 'mentions' });
        blocked = true;
      }
    }
  }

  // ATTACHMENTS
  const attachments = config.rules?.attachments;
  if (!blocked && attachments?.enabled && message.attachments.size > 0) {
    const entry = trackEntry(attachmentsMap, key, attachments.timeWindow, { count: 0, timeout: null });
    entry.count += message.attachments.size;
    if (entry.count >= attachments.maxAttachments) {
      attachmentsMap.delete(key);
      clearTimeout(entry.timeout);
      const reason = `Automod: Too many attachments (${entry.count} in ${attachments.timeWindow}s)`;
      const punishments = getDefaultPunishments(attachments);
      await applyPunishments(client, message, punishments, attachments.timeWindow, 'AUTOMOD_ATTACHMENTS', reason);
      await sendAlert(message.guild, attachments.alertChannel, attachments.alertMessage, { user: `<@${userId}>`, count: entry.count, limit: attachments.maxAttachments, channel: message.channel.name, rule: 'attachments' });
      blocked = true;
    }
  }

  // EMOJIS
  const emojis = config.rules?.emojis;
  if (!blocked && emojis?.enabled) {
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic}|<a?:[^:]+:\d+>)/gu;
    const matches = message.content.match(emojiRegex) || [];
    if (matches.length > 0) {
      const entry = trackEntry(emojisMap, key, emojis.timeWindow, { count: 0, timeout: null });
      entry.count += matches.length;
      if (entry.count >= emojis.maxEmojis) {
        emojisMap.delete(key);
        clearTimeout(entry.timeout);
        const reason = `Automod: Too many emojis (${entry.count} in ${emojis.timeWindow}s)`;
        const punishments = getDefaultPunishments(emojis);
        await applyPunishments(client, message, punishments, emojis.timeWindow, 'AUTOMOD_EMOJIS', reason);
        await sendAlert(message.guild, emojis.alertChannel, emojis.alertMessage, { user: `<@${userId}>`, count: entry.count, limit: emojis.maxEmojis, channel: message.channel.name, rule: 'emojis' });
        blocked = true;
      }
    }
  }

  // MSG LINES
  const msgLines = config.rules?.msgLines;
  if (!blocked && msgLines?.enabled) {
    const lineCount = (message.content.match(/\n/g) || []).length + 1;
    if (lineCount >= msgLines.deleteAt) {
      const reason = `Automod: Message with too many lines (${lineCount})`;
      const punishments = getDefaultPunishments(msgLines);
      await applyPunishments(client, message, punishments, 30, 'AUTOMOD_LINES', reason);
      await sendAlert(message.guild, msgLines.alertChannel, msgLines.alertMessage, { user: `<@${userId}>`, count: lineCount, limit: msgLines.deleteAt, channel: message.channel.name, rule: 'msglines' });
      blocked = true;
    } else if (lineCount >= msgLines.warnAt) {
      const reason = `Automod: Message with too many lines (${lineCount})`;
      await applyPunishments(client, message, [{ type: 'warn' }], 30, 'AUTOMOD_LINES', reason);
      await sendAlert(message.guild, msgLines.alertChannel, msgLines.alertMessage, { user: `<@${userId}>`, count: lineCount, limit: msgLines.warnAt, channel: message.channel.name, rule: 'msglines' });
      blocked = true;
    }
  }

  // CAPS
  const caps = config.rules?.caps;
  if (!blocked && caps?.enabled) {
    const content = message.content;
    const alpha = content.replace(/[^a-zA-Z]/g, '');
    if (alpha.length >= caps.minChars) {
      const upperCount = (alpha.match(/[A-Z]/g) || []).length;
      const pct = (upperCount / alpha.length) * 100;
      if (pct >= caps.percentage) {
        const reason = `Automod: Excessive caps (${Math.round(pct)}%)`;
        const punishments = getDefaultPunishments(caps);
        await applyPunishments(client, message, punishments, 30, 'AUTOMOD_CAPS', reason);
        await sendAlert(message.guild, caps.alertChannel, caps.alertMessage, { user: `<@${userId}>`, count: Math.round(pct), limit: caps.percentage, channel: message.channel.name, rule: 'caps' });
        blocked = true;
      }
    }
  }

  // WORDS
  const words = config.rules?.words;
  if (!blocked && words?.enabled && words.groups?.length) {
    const lower = message.content.toLowerCase();
    for (const group of words.groups) {
      const hit = group.words?.find(w => lower.includes(w.toLowerCase()));
      if (hit) {
        const reason = `Automod: Blocked word (group: ${group.name})`;
        const punishments = group.punishments?.length ? group.punishments : [{ type: 'delete_all' }];
        await applyPunishments(client, message, punishments, 30, 'AUTOMOD_WORDS', reason);
        await sendAlert(message.guild, group.alertChannel, group.alertMessage, { user: `<@${userId}>`, count: 1, limit: 0, channel: message.channel.name, rule: 'words' });
        blocked = true;
        break;
      }
    }
  }

  // LINKS
  const links = config.rules?.links;
  if (!blocked && links?.enabled) {
    const urlRegex = /https?:\/\/([^\s/]+)/gi;
    let match;
    while ((match = urlRegex.exec(message.content)) !== null) {
      const domain = match[1].replace(/^www\./, '');
      const allowed = links.whitelist?.some(w => domain === w || domain.endsWith('.' + w));
      if (!allowed) {
        const reason = `Automod: Blocked link (${domain})`;
        const punishments = getDefaultPunishments(links);
        await applyPunishments(client, message, punishments, 30, 'AUTOMOD_LINKS', reason);
        await sendAlert(message.guild, links.alertChannel, links.alertMessage, { user: `<@${userId}>`, count: 1, limit: 0, channel: message.channel.name, rule: 'links' });
        blocked = true;
        break;
      }
    }
  }

  // INVITES
  const invites = config.rules?.invites;
  if (!blocked && invites?.enabled) {
    const inviteRegex = /discord(?:\.gg|(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/gi;
    let match;
    while ((match = inviteRegex.exec(message.content)) !== null) {
      const code = match[1];
      const allowed = invites.whitelist?.includes(code);
      if (!allowed) {
        const reason = `Automod: Discord invite link`;
        const punishments = getDefaultPunishments(invites);
        await applyPunishments(client, message, punishments, 30, 'AUTOMOD_INVITES', reason);
        await sendAlert(message.guild, invites.alertChannel, invites.alertMessage, { user: `<@${userId}>`, count: 1, limit: 0, channel: message.channel.name, rule: 'invites' });
        blocked = true;
        break;
      }
    }
  }

  return blocked;
};
