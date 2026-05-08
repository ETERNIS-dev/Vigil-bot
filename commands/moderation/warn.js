const Case = require('../../database/models/Case');
const { createCase, resolveMember, canModerate, isImmune, expandReason, checkWarnThresholds, getGuild, sendPunishmentDM } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'warn',
  aliases: [],
  description: 'Warn a member.',
  usage: 'warn <@user> [reason]',
  permissions: ['ModerateMembers'],
  cooldown: 3,
  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please provide a user to warn.')] });
    const target = await resolveMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Could not find that member.')] });
    const botMember = message.guild.members.me;
    if (!canModerate(message.member, target, botMember)) return message.reply({ embeds: [errorEmbed('You cannot moderate that member.')] });
    if (await isImmune(target, message.guild.id)) return message.reply({ embeds: [errorEmbed('That member is immune from moderation.')] });
    const reason = await expandReason(message.guild.id, args.slice(1).join(' ') || 'No reason provided.');
    try {
      const guildSettings = await getGuild(message.guild.id);
      const newCase = await createCase(client, {
        guildId: message.guild.id, type: 'WARN',
        userId: target.id, userTag: target.user.tag,
        moderatorId: message.author.id, moderatorTag: message.author.tag,
        reason,
      });
      await sendPunishmentDM(target.user, 'warn', {
        server: message.guild.name,
        reason,
        moderator: message.author.tag,
        caseNumber: newCase.caseNumber,
        guildSettings,
      });
      const warnCount = await Case.countDocuments({ guildId: message.guild.id, userId: target.id, type: 'WARN' });
      await checkWarnThresholds(client, target, message.guild.id);
      message.reply({ embeds: [successEmbed(`Warned **${target.user.tag}**.\n**Reason:** ${reason}\n**Total Warns:** ${warnCount}`)] });
    } catch {
      message.reply({ embeds: [errorEmbed('Failed to warn that member.')] });
    }
  },
};
