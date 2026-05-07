const Guild = require('../../database/models/Guild');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'modlog',
  aliases: [],
  description: 'Set the mod log channel.',
  usage: 'modlog <#channel|none>',
  permissions: ['ManageGuild'],
  cooldown: 5,
  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please provide a channel or "none".')] });
    if (args[0].toLowerCase() === 'none') {
      await Guild.updateOne({ guildId: message.guild.id }, { $set: { modLogChannel: null } }, { upsert: true });
      return message.reply({ embeds: [successEmbed('Mod log channel removed.')] });
    }
    const ch = message.mentions.channels.first();
    if (!ch) return message.reply({ embeds: [errorEmbed('Please mention a valid channel.')] });
    await Guild.updateOne({ guildId: message.guild.id }, { $set: { modLogChannel: ch.id } }, { upsert: true });
    message.reply({ embeds: [successEmbed(`Mod log channel set to ${ch}.`)] });
  },
};
