const AutomodConfig = require('../../database/models/AutomodConfig');
const { getAutomod, invalidateAutomodCache } = require('../../utils/helpers');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'channelspam',
  aliases: [],
  description: 'Configure the channel spam automod rule.',
  usage: 'channelspam [on|off|limit|window|punishment|mute|alert|message] [value]',
  permissions: ['ManageGuild'],
  cooldown: 3,
  async execute(message, args, client) {
    const config = await getAutomod(message.guild.id);
    const sub = args[0]?.toLowerCase();
    if (!sub) {
      const r = config.rules.channelSpam;
      return message.reply({ embeds: [infoEmbed('Channel Spam Settings', `**Status:** ${r.enabled ? 'Enabled' : 'Disabled'}\n**Max Channels:** ${r.maxChannels}\n**Time Window:** ${r.timeWindow}s\n**Punishment:** ${r.punishment}\n**Mute Duration:** ${r.muteDuration}\n**Alert Channel:** ${r.alertChannel ? `<#${r.alertChannel}>` : 'None'}\n**Alert Message:** ${r.alertMessage}`)] });
    }
    const updates = {};
    if (sub === 'on') updates['rules.channelSpam.enabled'] = true;
    else if (sub === 'off') updates['rules.channelSpam.enabled'] = false;
    else if (sub === 'limit') {
      const v = parseInt(args[1]);
      if (isNaN(v) || v < 1) return message.reply({ embeds: [errorEmbed('Please provide a valid number.')] });
      updates['rules.channelSpam.maxChannels'] = v;
    } else if (sub === 'window') {
      const v = parseInt(args[1]);
      if (isNaN(v) || v < 1) return message.reply({ embeds: [errorEmbed('Please provide a valid number of seconds.')] });
      updates['rules.channelSpam.timeWindow'] = v;
    } else if (sub === 'punishment') {
      const valid = ['delete', 'warn', 'mute', 'kick', 'ban'];
      if (!valid.includes(args[1])) return message.reply({ embeds: [errorEmbed(`Valid punishments: ${valid.join(', ')}`)] });
      updates['rules.channelSpam.punishment'] = args[1];
    } else if (sub === 'mute') {
      if (!args[1]) return message.reply({ embeds: [errorEmbed('Please provide a duration (e.g. 10m).')] });
      updates['rules.channelSpam.muteDuration'] = args[1];
    } else if (sub === 'alert') {
      const ch = message.mentions.channels.first();
      updates['rules.channelSpam.alertChannel'] = args[1]?.toLowerCase() === 'none' ? null : ch?.id || null;
    } else if (sub === 'message') {
      if (!args[1]) return message.reply({ embeds: [errorEmbed('Please provide a message.')] });
      updates['rules.channelSpam.alertMessage'] = args.slice(1).join(' ');
    } else return message.reply({ embeds: [errorEmbed('Unknown subcommand.')] });
    await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: updates }, { upsert: true });
    invalidateAutomodCache(message.guild.id);
    message.reply({ embeds: [successEmbed('Channel spam settings updated.')] });
  },
};
