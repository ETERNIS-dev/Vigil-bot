const { expandReason } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'unlock',
  aliases: [],
  description: 'Unlock a channel.',
  usage: 'unlock [#channel] [reason]',
  permissions: ['ManageChannels'],
  cooldown: 5,
  async execute(message, args, client) {
    const channel = message.mentions.channels.first() || message.channel;
    const reason = await expandReason(message.guild.id, args.filter(a => !a.startsWith('<#')).join(' ') || 'Channel unlocked by moderator.');
    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null }, { reason });
      message.reply({ embeds: [successEmbed(`🔓 Unlocked ${channel}.\n**Reason:** ${reason}`)] });
    } catch {
      message.reply({ embeds: [errorEmbed('Failed to unlock that channel.')] });
    }
  },
};
