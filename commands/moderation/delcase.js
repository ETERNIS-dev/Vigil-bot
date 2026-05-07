const Case = require('../../database/models/Case');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'delcase',
  aliases: [],
  description: 'Delete a moderation case.',
  usage: 'delcase <caseID>',
  permissions: ['Administrator'],
  cooldown: 3,
  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please provide a case number.')] });
    const caseNum = parseInt(args[0]);
    if (isNaN(caseNum)) return message.reply({ embeds: [errorEmbed('Invalid case number.')] });
    const c = await Case.findOneAndDelete({ guildId: message.guild.id, caseNumber: caseNum });
    if (!c) return message.reply({ embeds: [errorEmbed(`Case #${caseNum} not found.`)] });
    message.reply({ embeds: [successEmbed(`Deleted case #${caseNum} (${c.type} on ${c.userTag}).`)] });
  },
};
