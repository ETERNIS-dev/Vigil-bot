const { createCase, resolveMember, canModerate, isImmune, parseDuration, expandReason } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'mute',
  aliases: ['timeout'],
  description: 'Mute (timeout) a member.',
  usage: 'mute <@user> <duration> [reason]',
  permissions: ['ModerateMembers'],
  cooldown: 3,
  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please provide a user to mute.')] });
    if (!args[1]) return message.reply({ embeds: [errorEmbed('Please provide a duration (e.g. 10m, 1h, 7d).')] });
    const target = await resolveMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Could not find that member.')] });
    const botMember = message.guild.members.me;
    if (!canModerate(message.member, target, botMember)) return message.reply({ embeds: [errorEmbed('You cannot moderate that member.')] });
    if (await isImmune(target, message.guild.id)) return message.reply({ embeds: [errorEmbed('That member is immune from moderation.')] });
    const durationStr = args[1];
    const ms = parseDuration(durationStr);
    if (!ms) return message.reply({ embeds: [errorEmbed('Invalid duration. Use formats like `10m`, `1h`, `7d`.')] });
    const maxMs = 28 * 24 * 60 * 60 * 1000;
    if (ms > maxMs) return message.reply({ embeds: [errorEmbed('Maximum mute duration is 28 days.')] });
    const reason = await expandReason(message.guild.id, args.slice(2).join(' ') || 'No reason provided.');
    const expiresAt = new Date(Date.now() + ms);
    try {
      await target.user.send(`🔇 You have been **muted** in **${message.guild.name}** for **${durationStr}**.\n**Reason:** ${reason}\n**Expires:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>`).catch(() => {});
      await target.timeout(ms, reason);
      await createCase(client, {
        guildId: message.guild.id, type: 'MUTE',
        userId: target.id, userTag: target.user.tag,
        moderatorId: message.author.id, moderatorTag: message.author.tag,
        reason, duration: durationStr, expiresAt,
      });
      message.reply({ embeds: [successEmbed(`Muted **${target.user.tag}** for **${durationStr}**.\n**Reason:** ${reason}\n**Expires:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>`)] });
    } catch {
      message.reply({ embeds: [errorEmbed('Failed to mute that member.')] });
    }
  },
};
