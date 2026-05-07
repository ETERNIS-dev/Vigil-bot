const Case = require('../../database/models/Case');
const { errorEmbed, infoEmbed } = require('../../utils/embedBuilder');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'case',
  aliases: [],
  description: 'View a specific moderation case.',
  usage: 'case <caseID>',
  permissions: ['ModerateMembers'],
  cooldown: 3,
  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please provide a case number.')] });
    const caseNum = parseInt(args[0]);
    if (isNaN(caseNum)) return message.reply({ embeds: [errorEmbed('Invalid case number.')] });
    const c = await Case.findOne({ guildId: message.guild.id, caseNumber: caseNum });
    if (!c) return message.reply({ embeds: [errorEmbed(`Case #${caseNum} not found.`)] });
    const color = COLORS[c.type.split('_')[0]] || COLORS.INFO;
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`Case #${c.caseNumber} — ${c.type}`)
      .addFields(
        { name: 'User', value: `${c.userTag} (${c.userId})`, inline: true },
        { name: 'Moderator', value: `${c.moderatorTag} (${c.moderatorId})`, inline: true },
        { name: 'Reason', value: c.reason },
        { name: 'Active', value: c.active ? 'Yes' : 'No', inline: true },
        { name: 'Date', value: `<t:${Math.floor(c.createdAt.getTime() / 1000)}:F>`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Vigil Moderation' });
    if (c.duration) embed.addFields({ name: 'Duration', value: c.duration, inline: true });
    if (c.expiresAt) embed.addFields({ name: 'Expires', value: `<t:${Math.floor(c.expiresAt.getTime() / 1000)}:R>`, inline: true });
    message.reply({ embeds: [embed] });
  },
};
