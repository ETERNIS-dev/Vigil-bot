const { createCase, resolveMember, canModerate, isImmune, expandReason } = require('../../utils/helpers');
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
      await target.user.send(`👢 You have been **kicked** from **${message.guild.name}**.\n**Reason:** ${reason}`).catch(() => {});
      await target.kick(reason);
      await createCase(client, {
        guildId: message.guild.id, type: 'KICK',
        userId: target.id, userTag: target.user.tag,
        moderatorId: message.author.id, moderatorTag: message.author.tag,
        reason,
      });
      message.reply({ embeds: [successEmbed(`Kicked **${target.user.tag}**.\n**Reason:** ${reason}`)] });
    } catch {
      message.reply({ embeds: [errorEmbed('Failed to kick that member.')] });
    }
  },
};
