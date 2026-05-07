const { getGuild } = require('../../utils/helpers');
const Guild = require('../../database/models/Guild');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'prefix',
  aliases: [],
  description: 'Change the bot prefix for this server.',
  usage: 'prefix <new prefix>',
  permissions: ['ManageGuild'],
  cooldown: 5,
  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please provide a new prefix.')] });
    const newPrefix = args[0];
    if (newPrefix.length > 5) return message.reply({ embeds: [errorEmbed('Prefix must be 5 characters or less.')] });
    await Guild.updateOne({ guildId: message.guild.id }, { $set: { prefix: newPrefix } }, { upsert: true });
    message.reply({ embeds: [successEmbed(`Prefix updated to \`${newPrefix}\`.`)] });
  },
};
