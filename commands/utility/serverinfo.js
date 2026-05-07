const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'serverinfo',
  aliases: ['si', 'guildinfo'],
  description: 'View information about this server.',
  usage: 'serverinfo',
  permissions: [],
  cooldown: 5,
  async execute(message, args, client) {
    const guild = message.guild;
    await guild.members.fetch();
    const members = guild.members.cache;
    const online = members.filter(m => m.presence?.status !== 'offline' && !m.user.bot).size;
    const bots = members.filter(m => m.user.bot).size;
    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const categories = guild.channels.cache.filter(c => c.type === 4).size;

    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: 'Server ID', value: guild.id, inline: true },
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Members', value: `Total: ${guild.memberCount}\nOnline: ${online}\nBots: ${bots}`, inline: true },
        { name: 'Channels', value: `Text: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categories}`, inline: true },
        { name: 'Roles', value: String(guild.roles.cache.size - 1), inline: true },
        { name: 'Emojis', value: String(guild.emojis.cache.size), inline: true },
        { name: 'Boost Level', value: `Level ${guild.premiumTier}`, inline: true },
        { name: 'Boosts', value: String(guild.premiumSubscriptionCount || 0), inline: true },
        { name: 'Verification', value: guild.verificationLevel.toString(), inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Vigil' });
    message.reply({ embeds: [embed] });
  },
};
