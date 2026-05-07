const { createCase, expandReason } = require('../../utils/helpers');
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
      await createCase(client, {
        guildId: message.guild.id, type: 'UNBAN',
        userId: id, userTag: ban.user.tag,
        moderatorId: message.author.id, moderatorTag: message.author.tag,
        reason,
      });
      message.reply({ embeds: [successEmbed(`Unbanned **${ban.user.tag}**.\n**Reason:** ${reason}`)] });
    } catch (err) {
      message.reply({ embeds: [errorEmbed('Failed to unban that user.')] });
    }
  },
};
