const ReactionRole = require('../../database/models/ReactionRole');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'rrole',
  aliases: ['reactionrole'],
  description: 'Manage reaction roles.',
  usage: 'rrole <create|addoption|removeoption|list|edit|delete> [args]',
  permissions: ['ManageRoles'],
  cooldown: 5,
  async execute(message, args, client) {
    const sub = args[0]?.toLowerCase();
    if (sub === 'create') {
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply({ embeds: [errorEmbed('Mention a channel.')] });
      const rest = args.slice(2).join(' ');
      const [title, description] = rest.split('|').map(s => s.trim());
      if (!title) return message.reply({ embeds: [errorEmbed('Provide title and description separated by |')] });
      const embed = new EmbedBuilder().setColor(COLORS.INFO).setTitle(title).setDescription(description || '\u200b').setTimestamp();
      const sent = await ch.send({ embeds: [embed] });
      await ReactionRole.create({ guildId: message.guild.id, channelId: ch.id, messageId: sent.id, embed: { title, description: description || '', color: '#3498db' }, options: [] });
      return message.reply({ embeds: [successEmbed(`Reaction role message created! ID: \`${sent.id}\``)] });
    }
    if (sub === 'addoption') {
      const msgId = args[1];
      const emoji = args[2];
      const role = message.mentions.roles.first();
      const description = args.slice(4).join(' ') || '';
      if (!msgId || !emoji || !role) return message.reply({ embeds: [errorEmbed('Usage: `rrole addoption <messageID> <emoji> <@role> [description]`')] });
      const doc = await ReactionRole.findOne({ messageId: msgId, guildId: message.guild.id });
      if (!doc) return message.reply({ embeds: [errorEmbed('Reaction role message not found.')] });
      doc.options.push({ emoji, roleId: role.id, description });
      await doc.save();
      const ch = message.guild.channels.cache.get(doc.channelId);
      if (ch) {
        const msg = await ch.messages.fetch(msgId).catch(() => null);
        if (msg) {
          const newEmbed = new EmbedBuilder().setColor(doc.embed.color || '#3498db').setTitle(doc.embed.title).setDescription(doc.embed.description || '\u200b');
          for (const opt of doc.options) newEmbed.addFields({ name: `${opt.emoji} <@&${opt.roleId}>`, value: opt.description || '\u200b', inline: true });
          await msg.edit({ embeds: [newEmbed] });
          await msg.react(emoji).catch(() => {});
        }
      }
      return message.reply({ embeds: [successEmbed(`Added option ${emoji} → ${role}.`)] });
    }
    if (sub === 'removeoption') {
      const msgId = args[1];
      const emoji = args[2];
      if (!msgId || !emoji) return message.reply({ embeds: [errorEmbed('Usage: `rrole removeoption <messageID> <emoji>`')] });
      const doc = await ReactionRole.findOne({ messageId: msgId, guildId: message.guild.id });
      if (!doc) return message.reply({ embeds: [errorEmbed('Not found.')] });
      doc.options = doc.options.filter(o => o.emoji !== emoji);
      await doc.save();
      const ch = message.guild.channels.cache.get(doc.channelId);
      if (ch) {
        const msg = await ch.messages.fetch(msgId).catch(() => null);
        if (msg) {
          const newEmbed = new EmbedBuilder().setColor(doc.embed.color || '#3498db').setTitle(doc.embed.title).setDescription(doc.embed.description || '\u200b');
          for (const opt of doc.options) newEmbed.addFields({ name: `${opt.emoji} <@&${opt.roleId}>`, value: opt.description || '\u200b', inline: true });
          await msg.edit({ embeds: [newEmbed] });
          const reaction = msg.reactions.cache.find(r => r.emoji.name === emoji || r.emoji.toString() === emoji);
          if (reaction) await reaction.users.remove(client.user.id).catch(() => {});
        }
      }
      return message.reply({ embeds: [successEmbed(`Removed option ${emoji}.`)] });
    }
    if (sub === 'list') {
      const docs = await ReactionRole.find({ guildId: message.guild.id });
      if (!docs.length) return message.reply({ embeds: [infoEmbed('Reaction Roles', 'None configured.')] });
      const list = docs.map(d => `**${d.embed.title || 'Untitled'}** — <#${d.channelId}> — ${d.options.length} options — ID: \`${d.messageId}\``).join('\n');
      return message.reply({ embeds: [infoEmbed('Reaction Roles', list)] });
    }
    if (sub === 'edit') {
      const msgId = args[1];
      const rest = args.slice(2).join(' ');
      const [title, description] = rest.split('|').map(s => s.trim());
      if (!msgId || !title) return message.reply({ embeds: [errorEmbed('Usage: `rrole edit <messageID> <title> | <description>`')] });
      const doc = await ReactionRole.findOne({ messageId: msgId, guildId: message.guild.id });
      if (!doc) return message.reply({ embeds: [errorEmbed('Not found.')] });
      doc.embed.title = title;
      if (description) doc.embed.description = description;
      await doc.save();
      const ch = message.guild.channels.cache.get(doc.channelId);
      if (ch) {
        const msg = await ch.messages.fetch(msgId).catch(() => null);
        if (msg) {
          const newEmbed = new EmbedBuilder().setColor(doc.embed.color || '#3498db').setTitle(title).setDescription(description || doc.embed.description || '\u200b');
          for (const opt of doc.options) newEmbed.addFields({ name: `${opt.emoji} <@&${opt.roleId}>`, value: opt.description || '\u200b', inline: true });
          await msg.edit({ embeds: [newEmbed] });
        }
      }
      return message.reply({ embeds: [successEmbed('Reaction role updated.')] });
    }
    if (sub === 'delete') {
      const msgId = args[1];
      if (!msgId) return message.reply({ embeds: [errorEmbed('Provide message ID.')] });
      const doc = await ReactionRole.findOneAndDelete({ messageId: msgId, guildId: message.guild.id });
      if (!doc) return message.reply({ embeds: [errorEmbed('Not found.')] });
      const ch = message.guild.channels.cache.get(doc.channelId);
      if (ch) {
        const msg = await ch.messages.fetch(msgId).catch(() => null);
        if (msg) await msg.reactions.removeAll().catch(() => {});
      }
      return message.reply({ embeds: [successEmbed('Reaction role deleted.')] });
    }
    message.reply({ embeds: [errorEmbed('Usage: `rrole <create|addoption|removeoption|list|edit|delete>`')] });
  },
};
