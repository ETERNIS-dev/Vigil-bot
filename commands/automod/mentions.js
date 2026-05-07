const AutomodConfig = require('../../database/models/AutomodConfig');
const { getAutomod, invalidateAutomodCache } = require('../../utils/helpers');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'mentions',
  aliases: [],
  description: 'Configure the mentions automod rule.',
  usage: 'mentions [on|off|limit|window|punishment|mute|alert|message] [value]',
  permissions: ['ManageGuild'],
  cooldown: 3,
  async execute(message, args, client) {
    const config = await getAutomod(message.guild.id);
    const sub = args[0]?.toLowerCase();
    if (!sub) {
      const r = config.rules.mentions;
      return message.reply({ embeds: [infoEmbed('Mentions Settings', `**Status:** ${r.enabled ? 'Enabled' : 'Disabled'}\n**Max Mentions:** ${r.maxMentions}\n**Time Window:** ${r.timeWindow}s\n**Punishment:** ${r.punishment}\n**Mute Duration:** ${r.muteDuration}\n**Alert Channel:** ${r.alertChannel ? `<#${r.alertChannel}>` : 'None'}\n**Alert Message:** ${r.alertMessage}`)] });
    }
    const updates = {};
    if (sub === 'on') updates['rules.mentions.enabled'] = true;
    else if (sub === 'off') updates['rules.mentions.enabled'] = false;
    else if (sub === 'limit') {
      const v = parseInt(args[1]);
      if (isNaN(v) || v < 1) return message.reply({ embeds: [errorEmbed('Provide a valid number.')] });
      updates['rules.mentions.maxMentions'] = v;
    } else if (sub === 'window') {
      const v = parseInt(args[1]);
      if (isNaN(v)) return message.reply({ embeds: [errorEmbed('Provide a valid number of seconds.')] });
      updates['rules.mentions.timeWindow'] = v;
    } else if (sub === 'punishment') {
      const valid = ['delete', 'warn', 'mute', 'kick', 'ban'];
      if (!valid.includes(args[1])) return message.reply({ embeds: [errorEmbed(`Valid punishments: ${valid.join(', ')}`)] });
      updates['rules.mentions.punishment'] = args[1];
    } else if (sub === 'mute') {
      updates['rules.mentions.muteDuration'] = args[1] || '10m';
    } else if (sub === 'alert') {
      const ch = message.mentions.channels.first();
      updates['rules.mentions.alertChannel'] = args[1]?.toLowerCase() === 'none' ? null : ch?.id || null;
    } else if (sub === 'message') {
      updates['rules.mentions.alertMessage'] = args.slice(1).join(' ');
    } else return message.reply({ embeds: [errorEmbed('Unknown subcommand.')] });
    await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: updates }, { upsert: true });
    invalidateAutomodCache(message.guild.id);
    message.reply({ embeds: [successEmbed('Mentions settings updated.')] });
  },
};
