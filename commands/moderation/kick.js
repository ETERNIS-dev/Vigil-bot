const { createCase, resolveMember, canModerate, isImmune, expandReason, getGuild, sendPunishmentDM } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'kick',
  aliases: [],
  description: 'Kick a member from the server.',
  usage: 'kick <@user> [reason]',
  permissions: ['KickMembers'],
  cooldown: 5,
  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please provide a user to kick.')] });
    const target = await resolveMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Could not find that member.')] });
    const botMember = message.guild.members.me;
    if (!canModerate(message.member, target, botMember)) return message.reply({ embeds: [errorEmbed('You cannot moderate that member.')] });
    if (await isImmune(target, message.guild.id)) return message.reply({ embeds: [errorEmbed('That member is immune from moderation.')] });
    const reason = await expandReason(message.guild.id, args.slice(1).join(' ') || 'No reason provided.');
    try {
      const guildSettings = await getGuild(message.guild.id);
      const newCase = await createCase(client, {
        guildId: message.guild.id, type: 'KICK',
        userId: target.id, userTag: target.user.tag,
        moderatorId: message.author.id, moderatorTag: message.author.tag,
        reason,
      });
      await sendPunishmentDM(target.user, 'kick', {
        server: message.guild.name,
        reason,
        moderator: message.author.tag,
        caseNumber: newCase.caseNumber,
        guildSettings,
      });
      await target.kick(reason);
      message.reply({ embeds: [successEmbed(`Kicked **${target.user.tag}**.\n**Reason:** ${reason}`)] });
    } catch {
      message.reply({ embeds: [errorEmbed('Failed to kick that member.')] });
    }
  },
};
