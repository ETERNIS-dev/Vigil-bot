const Guild = require('../../database/models/Guild');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'specialchannel',
  aliases: ['sc'],
  description: 'Set special channels (reports).',
  usage: 'specialchannel <reports> <#channel|none>',
  permissions: ['ManageGuild'],
  cooldown: 3,
  async execute(message, args, client) {
    const type = args[0]?.toLowerCase();
    if (!type) return message.reply({ embeds: [infoEmbed('Special Channels', 'Available types: `reports`')] });
    if (type === 'reports') {
      if (!args[1]) return message.reply({ embeds: [errorEmbed('Provide a channel mention or "none".')] });
      if (args[1].toLowerCase() === 'none') {
        await Guild.updateOne({ guildId: message.guild.id }, { $set: { reportsChannel: null } }, { upsert: true });
        return message.reply({ embeds: [successEmbed('Reports channel removed.')] });
      }
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply({ embeds: [errorEmbed('Please mention a valid channel.')] });
      await Guild.updateOne({ guildId: message.guild.id }, { $set: { reportsChannel: ch.id } }, { upsert: true });
      return message.reply({ embeds: [successEmbed(`Reports channel set to ${ch}.`)] });
    }
    message.reply({ embeds: [errorEmbed('Unknown channel type.')] });
  },
};
