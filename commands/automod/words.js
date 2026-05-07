const AutomodConfig = require('../../database/models/AutomodConfig');
const { getAutomod, invalidateAutomodCache } = require('../../utils/helpers');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'words',
  aliases: [],
  description: 'Configure the blocked words automod rule.',
  usage: 'words [on|off|group <add|delete|addword|removeword|list|punishment|mute|alert|message> ...]',
  permissions: ['ManageGuild'],
  cooldown: 3,
  async execute(message, args, client) {
    const config = await getAutomod(message.guild.id);
    const sub = args[0]?.toLowerCase();
    if (!sub) {
      const r = config.rules.words;
      const groups = r.groups?.map(g => `**${g.name}** (${g.words.length} words, punishment: ${g.punishment})`).join('\n') || 'None';
      return message.reply({ embeds: [infoEmbed('Words Settings', `**Status:** ${r.enabled ? 'Enabled' : 'Disabled'}\n**Groups:**\n${groups}`)] });
    }
    if (sub === 'on') {
      await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: { 'rules.words.enabled': true } }, { upsert: true });
      invalidateAutomodCache(message.guild.id);
      return message.reply({ embeds: [successEmbed('Words filter enabled.')] });
    }
    if (sub === 'off') {
      await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: { 'rules.words.enabled': false } }, { upsert: true });
      invalidateAutomodCache(message.guild.id);
      return message.reply({ embeds: [successEmbed('Words filter disabled.')] });
    }
    if (sub === 'group') {
      const action = args[1]?.toLowerCase();
      const groupName = args[2];
      if (!action) return message.reply({ embeds: [errorEmbed('Please specify a group action.')] });

      let docConfig = await AutomodConfig.findOne({ guildId: message.guild.id });
      if (!docConfig) docConfig = await AutomodConfig.create({ guildId: message.guild.id });

      if (action === 'add') {
        if (!groupName) return message.reply({ embeds: [errorEmbed('Please provide a group name.')] });
        const exists = docConfig.rules.words.groups.some(g => g.name === groupName);
        if (exists) return message.reply({ embeds: [errorEmbed('A group with that name already exists.')] });
        docConfig.rules.words.groups.push({ name: groupName, words: [], punishment: 'delete', muteDuration: '10m' });
        await docConfig.save();
        invalidateAutomodCache(message.guild.id);
        return message.reply({ embeds: [successEmbed(`Created word group **${groupName}**.`)] });
      }
      if (action === 'delete') {
        if (!groupName) return message.reply({ embeds: [errorEmbed('Please provide a group name.')] });
        docConfig.rules.words.groups = docConfig.rules.words.groups.filter(g => g.name !== groupName);
        await docConfig.save();
        invalidateAutomodCache(message.guild.id);
        return message.reply({ embeds: [successEmbed(`Deleted word group **${groupName}**.`)] });
      }
      const group = docConfig.rules.words.groups.find(g => g.name === groupName);
      if (!group && action !== 'list') return message.reply({ embeds: [errorEmbed(`Group **${groupName}** not found.`)] });

      if (action === 'addword') {
        const word = args[3];
        if (!word) return message.reply({ embeds: [errorEmbed('Please provide a word to add.')] });
        if (!group.words.includes(word.toLowerCase())) group.words.push(word.toLowerCase());
        await docConfig.save();
        invalidateAutomodCache(message.guild.id);
        return message.reply({ embeds: [successEmbed(`Added **${word}** to group **${groupName}**.`)] });
      }
      if (action === 'removeword') {
        const word = args[3];
        if (!word) return message.reply({ embeds: [errorEmbed('Please provide a word to remove.')] });
        group.words = group.words.filter(w => w !== word.toLowerCase());
        await docConfig.save();
        invalidateAutomodCache(message.guild.id);
        return message.reply({ embeds: [successEmbed(`Removed **${word}** from group **${groupName}**.`)] });
      }
      if (action === 'list') {
        const groups = docConfig.rules.words.groups;
        if (!groups.length) return message.reply({ embeds: [infoEmbed('Word Groups', 'No groups configured.')] });
        if (groupName) {
          const g = groups.find(g => g.name === groupName);
          if (!g) return message.reply({ embeds: [errorEmbed(`Group **${groupName}** not found.`)] });
          return message.reply({ embeds: [infoEmbed(`Group: ${g.name}`, `**Words:** ${g.words.join(', ') || 'None'}\n**Punishment:** ${g.punishment}\n**Mute Duration:** ${g.muteDuration}`)] });
        }
        return message.reply({ embeds: [infoEmbed('All Word Groups', groups.map(g => `**${g.name}**: ${g.words.length} words`).join('\n'))] });
      }
      if (action === 'punishment') {
        const valid = ['delete', 'warn', 'mute', 'kick', 'ban'];
        if (!valid.includes(args[3])) return message.reply({ embeds: [errorEmbed(`Valid: ${valid.join(', ')}`)] });
        group.punishment = args[3];
        await docConfig.save();
        invalidateAutomodCache(message.guild.id);
        return message.reply({ embeds: [successEmbed(`Set punishment for **${groupName}** to **${args[3]}**.`)] });
      }
      if (action === 'mute') {
        group.muteDuration = args[3] || '10m';
        await docConfig.save();
        invalidateAutomodCache(message.guild.id);
        return message.reply({ embeds: [successEmbed(`Set mute duration for **${groupName}**.`)] });
      }
      if (action === 'alert') {
        const ch = message.mentions.channels.first();
        group.alertChannel = args[3]?.toLowerCase() === 'none' ? null : ch?.id || null;
        await docConfig.save();
        invalidateAutomodCache(message.guild.id);
        return message.reply({ embeds: [successEmbed(`Updated alert channel for **${groupName}**.`)] });
      }
      if (action === 'message') {
        group.alertMessage = args.slice(3).join(' ');
        await docConfig.save();
        invalidateAutomodCache(message.guild.id);
        return message.reply({ embeds: [successEmbed(`Updated alert message for **${groupName}**.`)] });
      }
      return message.reply({ embeds: [errorEmbed('Unknown group action.')] });
    }
    return message.reply({ embeds: [errorEmbed('Unknown subcommand.')] });
  },
};
