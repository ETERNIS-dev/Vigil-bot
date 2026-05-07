const AutomodConfig = require('../../database/models/AutomodConfig');
const { getAutomod, invalidateAutomodCache } = require('../../utils/helpers');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'emojis',
  aliases: [],
  description: 'Configure the emojis automod rule.',
  usage: 'emojis [on|off|limit|window|punishment|mute|alert|message] [value]',
  permissions: ['ManageGuild'],
  cooldown: 3,
  async execute(message, args, client) {
    const config = await getAutomod(message.guild.id);
    const sub = args[0]?.toLowerCase();
    if (!sub) {
      const r = config.rules.emojis;
      return message.reply({ embeds: [infoEmbed('Emojis Settings', `**Status:** ${r.enabled ? 'Enabled' : 'Disabled'}\n**Max Emojis:** ${r.maxEmojis}\n**Time Window:** ${r.timeWindow}s\n**Punishment:** ${r.punishment}\n**Mute Duration:** ${r.muteDuration}`)] });
    }
    const updates = {};
    if (sub === 'on') updates['rules.emojis.enabled'] = true;
    else if (sub === 'off') updates['rules.emojis.enabled'] = false;
    else if (sub === 'limit') {
      const v = parseInt(args[1]);
      if (isNaN(v)) return message.reply({ embeds: [errorEmbed('Provide a valid number.')] });
      updates['rules.emojis.maxEmojis'] = v;
    } else if (sub === 'window') {
      const v = parseInt(args[1]);
      if (isNaN(v)) return message.reply({ embeds: [errorEmbed('Provide a valid seconds number.')] });
      updates['rules.emojis.timeWindow'] = v;
    } else if (sub === 'punishment') {
      const valid = ['delete', 'warn', 'mute', 'kick', 'ban'];
      if (!valid.includes(args[1])) return message.reply({ embeds: [errorEmbed(`Valid: ${valid.join(', ')}`)] });
      updates['rules.emojis.punishment'] = args[1];
    } else if (sub === 'mute') {
      updates['rules.emojis.muteDuration'] = args[1] || '5m';
    } else if (sub === 'alert') {
      const ch = message.mentions.channels.first();
      updates['rules.emojis.alertChannel'] = args[1]?.toLowerCase() === 'none' ? null : ch?.id || null;
    } else if (sub === 'message') {
      updates['rules.emojis.alertMessage'] = args.slice(1).join(' ');
    } else return message.reply({ embeds: [errorEmbed('Unknown subcommand.')] });
    await AutomodConfig.updateOne({ guildId: message.guild.id }, { $set: updates }, { upsert: true });
    invalidateAutomodCache(message.guild.id);
    message.reply({ embeds: [successEmbed('Emojis settings updated.')] });
  },
};
