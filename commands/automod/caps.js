const AutomodConfig = require('../../database/models/AutomodConfig');
const { getAutomod, invalidateAutomodCache } = require('../../utils/helpers');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'caps',
  aliases: [],
  description: 'Configure the caps automod rule.',
  usage: 'caps [on|off|percent|minchars|punishment|mute|alert|message] [value]',
  permissions: ['ManageGuild'],
  cooldown: 3,
  async execute(message, args, client) {
    const config = await getAutomod(message.guild.id);
    const sub = args[0]?.toLowerCase();
    if (!sub) {
      const r = config.rules.caps;
      return message.reply({ embeds: [infoEmbed('Caps Settings', `**Status:** ${r.enabled ? 'Enabled' : 'Disabled'}\n**Min Chars:** ${r.minChars}\n**Percentage:** ${r.percentage}%\n**Punishment:** ${r.punishment}\n**Mute Duration:** ${r.muteDuration}`)] });
    }
    const updates = {};
    if (sub === 'on') updates['rules.caps.enabled'] = true;
    else if (sub === 'off') updates['rules.caps.enabled'] = false;
    else if (sub === 'percent') {
      const v = parseInt(args[1]);
      if (isNaN(v) || v < 1 || v > 100) return message.reply({ embeds: [errorEmbed('Provide a percentage 1–100.')] });
      updates['rules.caps.percentage'] = v;
    } else if (sub === 'minchars') {
      const v = parseInt(args[1]);
      if (isNaN(v) || v < 1) return message.reply({ embeds: [errorEmbed('Provide a valid number.')] });
      updates['rules.caps.minChars'] = v;
    } else if (sub === 'punishment') {
      const valid = ['delete', 'warn', 'mute', 'kick', 'ban'];
      if (!valid.includes(args[1])) return message.reply({ embeds: [errorEmbed(`Valid: ${valid.join(', ')}`)] });
      updates['rules.caps.punishment'] = args[1];
    } else if (sub === 'mute') {
      updates['rules.caps.muteDuration'] = args[1] || '5m';
    } else if (sub === 'alert') {
      const ch = message.mentions.channels.first();
      updates['rules.caps.alertChannel'] = args[1]?.toLowerCase() === 'none' ? null : ch?.id || null;
    } else if (sub === 'message') {
      updates['rules.caps.alertMessage'] = args.slice(1).join(' ');
    } else return message.reply({ embeds: [errorEmbed('Unknown subcommand.')] });
    await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: updates }, { upsert: true });
    invalidateAutomodCache(message.guild.id);
    message.reply({ embeds: [successEmbed('Caps settings updated.')] });
  },
};
