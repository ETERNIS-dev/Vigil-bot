const AutomodConfig = require('../../database/models/AutomodConfig');
const { getAutomod, invalidateAutomodCache } = require('../../utils/helpers');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'msglines',
  aliases: [],
  description: 'Configure the message lines automod rule.',
  usage: 'msglines [on|off|warnat|deleteat|window|punishment|alert|message] [value]',
  permissions: ['ManageGuild'],
  cooldown: 3,
  async execute(message, args, client) {
    const config = await getAutomod(message.guild.id);
    const sub = args[0]?.toLowerCase();
    if (!sub) {
      const r = config.rules.msgLines;
      return message.reply({ embeds: [infoEmbed('Msg Lines Settings', `**Status:** ${r.enabled ? 'Enabled' : 'Disabled'}\n**Warn At:** ${r.warnAt} lines\n**Delete At:** ${r.deleteAt} lines\n**Time Window:** ${r.timeWindow}s\n**Punishment:** ${r.punishment}`)] });
    }
    const updates = {};
    if (sub === 'on') updates['rules.msgLines.enabled'] = true;
    else if (sub === 'off') updates['rules.msgLines.enabled'] = false;
    else if (sub === 'warnat') {
      const v = parseInt(args[1]);
      if (isNaN(v)) return message.reply({ embeds: [errorEmbed('Provide a valid number.')] });
      updates['rules.msgLines.warnAt'] = v;
    } else if (sub === 'deleteat') {
      const v = parseInt(args[1]);
      if (isNaN(v)) return message.reply({ embeds: [errorEmbed('Provide a valid number.')] });
      updates['rules.msgLines.deleteAt'] = v;
    } else if (sub === 'window') {
      const v = parseInt(args[1]);
      if (isNaN(v)) return message.reply({ embeds: [errorEmbed('Provide valid seconds.')] });
      updates['rules.msgLines.timeWindow'] = v;
    } else if (sub === 'punishment') {
      const valid = ['delete', 'warn', 'mute', 'kick', 'ban'];
      if (!valid.includes(args[1])) return message.reply({ embeds: [errorEmbed(`Valid: ${valid.join(', ')}`)] });
      updates['rules.msgLines.punishment'] = args[1];
    } else if (sub === 'alert') {
      const ch = message.mentions.channels.first();
      updates['rules.msgLines.alertChannel'] = args[1]?.toLowerCase() === 'none' ? null : ch?.id || null;
    } else if (sub === 'message') {
      updates['rules.msgLines.alertMessage'] = args.slice(1).join(' ');
    } else return message.reply({ embeds: [errorEmbed('Unknown subcommand.')] });
    await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: updates }, { upsert: true });
    invalidateAutomodCache(message.guild.id);
    message.reply({ embeds: [successEmbed('Msg lines settings updated.')] });
  },
};
