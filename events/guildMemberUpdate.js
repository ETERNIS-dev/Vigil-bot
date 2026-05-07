const WelcomeMessage = require('../database/models/WelcomeMessage');
const RoleConnection = require('../database/models/RoleConnection');
const LogConfig = require('../database/models/LogConfig');
const { logEmbed, COLORS } = require('../utils/embedBuilder');
const { sendWelcomeMessages } = require('../utils/helpers');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    // Boost detection
    if (!oldMember.premiumSince && newMember.premiumSince) {
      await sendWelcomeMessages(client, newMember, 'boost');
    }

    // Role changes
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    // Role messages
    try {
      for (const [, role] of addedRoles) {
        const msgs = await WelcomeMessage.find({ guildId: newMember.guild.id, type: 'rolemsg', enabled: true, roleCondition: role.id, roleAction: 'add' });
        for (const msg of msgs) {
          const ch = newMember.guild.channels.cache.get(msg.channelId);
          if (!ch) continue;
          await sendSingleMessage(ch, msg, newMember, { roleAdded: role.name });
        }
      }
      for (const [, role] of removedRoles) {
        const msgs = await WelcomeMessage.find({ guildId: newMember.guild.id, type: 'rolemsg', enabled: true, roleCondition: role.id, roleAction: 'remove' });
        for (const msg of msgs) {
          const ch = newMember.guild.channels.cache.get(msg.channelId);
          if (!ch) continue;
          await sendSingleMessage(ch, msg, newMember, { roleRemoved: role.name });
        }
      }
    } catch (_) { /* silent */ }

    // Role connections
    try {
      const connections = await RoleConnection.find({ guildId: newMember.guild.id });
      for (const conn of connections) {
        const conditionAdded = addedRoles.has(conn.conditionRoleId);
        const conditionRemoved = removedRoles.has(conn.conditionRoleId);
        if (conditionAdded || conditionRemoved) {
          const shouldAdd = conditionAdded && conn.action === 'add' || conditionRemoved && conn.action === 'remove';
          if (shouldAdd) {
            await newMember.roles.add(conn.targetRoleId).catch(() => {});
          }
        }
      }
    } catch (_) { /* silent */ }

    // Log nick/role changes
    try {
      const logConfig = await LogConfig.findOne({ guildId: newMember.guild.id });
      if (logConfig?.channels?.members) {
        const ch = newMember.guild.channels.cache.get(logConfig.channels.members);
        if (ch) {
          if (oldMember.nickname !== newMember.nickname) {
            const embed = logEmbed({
              type: 'NICK_CHANGE',
              title: 'Nickname Changed',
              color: COLORS.LOG_MEMBER,
              user: newMember.user,
              fields: [
                { name: 'User', value: `${newMember.user.tag}`, inline: true },
                { name: 'Before', value: oldMember.nickname || 'None', inline: true },
                { name: 'After', value: newMember.nickname || 'None', inline: true },
              ],
            });
            await ch.send({ embeds: [embed] });
          }
          if (addedRoles.size || removedRoles.size) {
            const fields = [];
            if (addedRoles.size) fields.push({ name: 'Roles Added', value: addedRoles.map(r => r.toString()).join(', ') });
            if (removedRoles.size) fields.push({ name: 'Roles Removed', value: removedRoles.map(r => r.toString()).join(', ') });
            const embed = logEmbed({
              type: 'ROLE_CHANGE',
              title: 'Member Roles Updated',
              color: COLORS.LOG_MEMBER,
              user: newMember.user,
              fields: [{ name: 'User', value: newMember.user.tag, inline: true }, ...fields],
            });
            await ch.send({ embeds: [embed] });
          }
        }
      }
    } catch (_) { /* silent */ }
  },
};

async function sendSingleMessage(channel, msg, member, extra = {}) {
  const { resolveVariables } = require('../utils/helpers');
  const { EmbedBuilder } = require('discord.js');
  const data = { user: member.user, guild: member.guild, ...extra };
  const pingText = msg.pingUser ? `<@${member.id}> ` : '';
  if (msg.embed.useEmbed) {
    const embed = new EmbedBuilder().setColor(msg.embed.color || '#5865F2');
    if (msg.embed.title) embed.setTitle(resolveVariables(msg.embed.title, data));
    if (msg.embed.description) embed.setDescription(resolveVariables(msg.embed.description, data));
    if (msg.embed.thumbnail && member.user.displayAvatarURL) embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
    if (msg.embed.footer) embed.setFooter({ text: resolveVariables(msg.embed.footer, data) });
    if (msg.embed.image) embed.setImage(msg.embed.image);
    if (msg.embed.fields?.length) embed.addFields(msg.embed.fields.map(f => ({ name: resolveVariables(f.name, data), value: resolveVariables(f.value, data), inline: f.inline })));
    embed.setTimestamp();
    await channel.send({ content: pingText || undefined, embeds: [embed] });
  } else {
    await channel.send(pingText + resolveVariables(msg.plainMessage || '', data));
  }
}
