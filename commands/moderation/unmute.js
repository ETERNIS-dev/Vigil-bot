const { createCase, resolveMember, expandReason } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'unmute',
  aliases: ['untimeout'],
  description: 'Remove a timeout from a member.',
  usage: 'unmute <@user> [reason]',
  permissions: ['ModerateMembers'],
  cooldown: 3,
  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please provide a user to unmute.')] });
    const target = await resolveMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Could not find that member.')] });
    if (!target.isCommunicationDisabled()) return message.reply({ embeds: [errorEmbed('That member is not muted.')] });
    const reason = await expandReason(message.guild.id, args.slice(1).join(' ') || 'No reason provided.');
    try {
      await target.timeout(null, reason);
      await createCase(client, {
        guildId: message.guild.id, type: 'UNMUTE',
        userId: target.id, userTag: target.user.tag,
        moderatorId: message.author.id, moderatorTag: message.author.tag,
        reason,
      });
      message.reply({ embeds: [successEmbed(`Unmuted **${target.user.tag}**.\n**Reason:** ${reason}`)] });
    } catch {
      message.reply({ embeds: [errorEmbed('Failed to unmute that member.')] });
    }
  },
};
