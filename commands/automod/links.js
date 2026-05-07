const AutomodConfig = require('../../database/models/AutomodConfig');
const { getAutomod, invalidateAutomodCache } = require('../../utils/helpers');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'links',
  aliases: [],
  description: 'Configure the links automod rule.',
  usage: 'links [on|off|whitelist <add|remove|list>|punishment|mute|alert|message] [value]',
  permissions: ['ManageGuild'],
  cooldown: 3,
  async execute(message, args, client) {
    const config = await getAutomod(message.guild.id);
    const sub = args[0]?.toLowerCase();
    if (!sub) {
      const r = config.rules.links;
      return message.reply({ embeds: [infoEmbed('Links Settings', `**Status:** ${r.enabled ? 'Enabled' : 'Disabled'}\n**Whitelist:** ${r.whitelist?.join(', ') || 'None'}\n**Punishment:** ${r.punishment}\n**Mute Duration:** ${r.muteDuration}`)] });
    }
    if (sub === 'on') {
      await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: { 'rules.links.enabled': true } }, { upsert: true });
    } else if (sub === 'off') {
      await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: { 'rules.links.enabled': false } }, { upsert: true });
    } else if (sub === 'whitelist') {
      const action = args[1]?.toLowerCase();
      const domain = args[2];
      if (action === 'add') {
        if (!domain) return message.reply({ embeds: [errorEmbed('Please provide a domain to whitelist.')] });
        await AutomodConfig.updateOne({ guildId: message.guild.id }, { $addToSet: { 'rules.links.whitelist': domain.toLowerCase() } }, { upsert: true });
      } else if (action === 'remove') {
        if (!domain) return message.reply({ embeds: [errorEmbed('Please provide a domain to remove.')] });
        await AutomodConfig.updateOne({ guildId: message.guild.id }, { $pull: { 'rules.links.whitelist': domain.toLowerCase() } });
      } else if (action === 'list') {
        const updated = await getAutomod(message.guild.id);
        return message.reply({ embeds: [infoEmbed('Links Whitelist', updated.rules.links.whitelist?.join('\n') || 'Empty')] });
      } else return message.reply({ embeds: [errorEmbed('Use: whitelist add/remove/list')] });
    } else if (sub === 'punishment') {
      const valid = ['delete', 'warn', 'mute', 'kick', 'ban'];
      if (!valid.includes(args[1])) return message.reply({ embeds: [errorEmbed(`Valid: ${valid.join(', ')}`)] });
      await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: { 'rules.links.punishment': args[1] } }, { upsert: true });
    } else if (sub === 'mute') {
      await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: { 'rules.links.muteDuration': args[1] || '10m' } }, { upsert: true });
    } else if (sub === 'alert') {
      const ch = message.mentions.channels.first();
      await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: { 'rules.links.alertChannel': args[1]?.toLowerCase() === 'none' ? null : ch?.id || null } }, { upsert: true });
    } else if (sub === 'message') {
      await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: { 'rules.links.alertMessage': args.slice(1).join(' ') } }, { upsert: true });
    } else return message.reply({ embeds: [errorEmbed('Unknown subcommand.')] });
    invalidateAutomodCache(message.guild.id);
    message.reply({ embeds: [successEmbed('Links settings updated.')] });
  },
};
