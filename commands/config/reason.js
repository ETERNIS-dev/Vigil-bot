const { getGuild } = require('../../utils/helpers');
const Guild = require('../../database/models/Guild');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'reason',
  aliases: [],
  description: 'Manage predefined reason aliases.',
  usage: 'reason <add|remove|list> [alias] [reason text]',
  permissions: ['ManageGuild'],
  cooldown: 3,
  async execute(message, args, client) {
    const sub = args[0]?.toLowerCase();
    const guildSettings = await getGuild(message.guild.id);
    if (sub === 'list') {
      const aliases = guildSettings.reasonAliases;
      if (!aliases || !aliases.size) return message.reply({ embeds: [infoEmbed('Reason Aliases', 'No aliases configured.')] });
      const lines = [...aliases.entries()].map(([k, v]) => `**${k}** → ${v}`).join('\n');
      return message.reply({ embeds: [infoEmbed('Reason Aliases', lines)] });
    }
    if (sub === 'add') {
      const alias = args[1];
      const reasonText = args.slice(2).join(' ');
      if (!alias || !reasonText) return message.reply({ embeds: [errorEmbed('Usage: `reason add <alias> <reason text>`')] });
      await Guild.updateOne({ guildId: message.guild.id }, { $set: { [`reasonAliases.${alias}`]: reasonText } }, { upsert: true });
      return message.reply({ embeds: [successEmbed(`Alias **${alias}** → "${reasonText}" saved.`)] });
    }
    if (sub === 'remove') {
      const alias = args[1];
      if (!alias) return message.reply({ embeds: [errorEmbed('Please provide an alias to remove.')] });
      await Guild.updateOne({ guildId: message.guild.id }, { $unset: { [`reasonAliases.${alias}`]: '' } });
      return message.reply({ embeds: [successEmbed(`Alias **${alias}** removed.`)] });
    }
    message.reply({ embeds: [errorEmbed('Usage: `reason <add|remove|list>`')] });
  },
};
