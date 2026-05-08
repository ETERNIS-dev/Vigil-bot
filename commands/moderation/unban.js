const { createCase, expandReason, getGuild, sendPunishmentDM } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'unban',
  aliases: [],
  description: 'Unban a user from the server.',
  usage: 'unban <userID> [reason]',
  permissions: ['BanMembers'],
  cooldown: 5,
  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please provide a user ID to unban.')] });
    const id = args[0].replace(/[<@!>]/g, '');
    const reason = await expandReason(message.guild.id, args.slice(1).join(' ') || 'No reason provided.');
    try {
      const ban = await message.guild.bans.fetch(id).catch(() => null);
      if (!ban) return message.reply({ embeds: [errorEmbed('That user is not banned.')] });
      await message.guild.members.unban(id, reason);
      const guildSettings = await getGuild(message.guild.id);
      const newCase = await createCase(client, {
        guildId: message.guild.id, type: 'UNBAN',
        userId: id, userTag: ban.user.tag,
        moderatorId: message.author.id, moderatorTag: message.author.tag,
        reason,
      });
      await sendPunishmentDM(ban.user, 'unban', {
        server: message.guild.name,
        reason,
        moderator: message.author.tag,
        caseNumber: newCase.caseNumber,
        guildSettings,
      });
      message.reply({ embeds: [successEmbed(`Unbanned **${ban.user.tag}**.\n**Reason:** ${reason}`)] });
    } catch {
      message.reply({ embeds: [errorEmbed('Failed to unban that user.')] });
    }
  },
};
