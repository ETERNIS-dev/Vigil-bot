const { PermissionFlagsBits } = require('discord.js');
const { createCase, expandReason } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'lock',
  aliases: [],
  description: 'Lock a channel, preventing members from sending messages.',
  usage: 'lock [#channel] [reason]',
  permissions: ['ManageChannels'],
  cooldown: 5,
  async execute(message, args, client) {
    const channel = message.mentions.channels.first() || message.channel;
    const reason = await expandReason(message.guild.id, args.filter(a => !a.startsWith('<#')).join(' ') || 'Channel locked by moderator.');
    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }, { reason });
      await createCase(client, {
        guildId: message.guild.id, type: 'LOCK',
        userId: message.guild.id, userTag: `#${channel.name}`,
        moderatorId: message.author.id, moderatorTag: message.author.tag,
        reason,
      });
      message.reply({ embeds: [successEmbed(`🔒 Locked ${channel}.\n**Reason:** ${reason}`)] });
    } catch {
      message.reply({ embeds: [errorEmbed('Failed to lock that channel.')] });
    }
  },
};
