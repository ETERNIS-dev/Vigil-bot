const AutomodConfig = require('../../database/models/AutomodConfig');
const { getAutomod, invalidateAutomodCache } = require('../../utils/helpers');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'invites',
  aliases: [],
  description: 'Configure the invites automod rule.',
  usage: 'invites [on|off|whitelist <add|remove|list>|punishment|mute|alert|message] [value]',
  permissions: ['ManageGuild'],
  cooldown: 3,
  async execute(message, args, client) {
    const config = await getAutomod(message.guild.id);
    const sub = args[0]?.toLowerCase();
    if (!sub) {
      const r = config.rules.invites;
      return message.reply({ embeds: [infoEmbed('Invites Settings', `**Status:** ${r.enabled ? 'Enabled' : 'Disabled'}\n**Whitelist (Server IDs):** ${r.whitelist?.join(', ') || 'None'}\n**Punishment:** ${r.punishment}`)] });
    }
    if (sub === 'on') {
      await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: { 'rules.invites.enabled': true } }, { upsert: true });
    } else if (sub === 'off') {
      await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: { 'rules.invites.enabled': false } }, { upsert: true });
    } else if (sub === 'whitelist') {
      const action = args[1]?.toLowerCase();
      const serverId = args[2];
      if (action === 'add') {
        if (!serverId) return message.reply({ embeds: [errorEmbed('Please provide a server ID.')] });
        await AutomodConfig.updateOne({ guildId: message.guild.id }, { $addToSet: { 'rules.invites.whitelist': serverId } }, { upsert: true });
      } else if (action === 'remove') {
        if (!serverId) return message.reply({ embeds: [errorEmbed('Please provide a server ID.')] });
        await AutomodConfig.updateOne({ guildId: message.guild.id }, { $pull: { 'rules.invites.whitelist': serverId } });
      } else if (action === 'list') {
        const updated = await AutomodConfig.findOne({ guildId: message.guild.id });
        return message.reply({ embeds: [infoEmbed('Invites Whitelist', updated?.rules?.invites?.whitelist?.join('\n') || 'Empty')] });
      } else return message.reply({ embeds: [errorEmbed('Use: whitelist add/remove/list')] });
    } else if (sub === 'punishment') {
      const valid = ['delete', 'warn', 'mute', 'kick', 'ban'];
      if (!valid.includes(args[1])) return message.reply({ embeds: [errorEmbed(`Valid: ${valid.join(', ')}`)] });
      await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: { 'rules.invites.punishment': args[1] } }, { upsert: true });
    } else if (sub === 'mute') {
      await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: { 'rules.invites.muteDuration': args[1] || '10m' } }, { upsert: true });
    } else if (sub === 'alert') {
      const ch = message.mentions.channels.first();
      await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: { 'rules.invites.alertChannel': args[1]?.toLowerCase() === 'none' ? null : ch?.id || null } }, { upsert: true });
    } else if (sub === 'message') {
      await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: { 'rules.invites.alertMessage': args.slice(1).join(' ') } }, { upsert: true });
    } else return message.reply({ embeds: [errorEmbed('Unknown subcommand.')] });
    invalidateAutomodCache(message.guild.id);
    message.reply({ embeds: [successEmbed('Invites settings updated.')] });
  },
};
