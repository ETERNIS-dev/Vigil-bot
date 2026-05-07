const Case = require('../../database/models/Case');
const { resolveMember } = require('../../utils/helpers');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'userinfo',
  aliases: ['ui', 'whois'],
  description: 'View information about a user.',
  usage: 'userinfo [@user]',
  permissions: [],
  cooldown: 5,
  async execute(message, args, client) {
    const target = args[0] ? await resolveMember(message.guild, args[0]) : message.member;
    if (!target) return message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.ERROR).setDescription('❌ Could not find that member.')] });

    const user = target.user;
    const warns = await Case.countDocuments({ guildId: message.guild.id, userId: user.id, type: 'WARN' });
    const bans = await Case.countDocuments({ guildId: message.guild.id, userId: user.id, type: 'BAN' });
    const kicks = await Case.countDocuments({ guildId: message.guild.id, userId: user.id, type: 'KICK' });

    const roles = target.roles.cache.filter(r => r.id !== message.guild.id).sort((a, b) => b.position - a.position);
    const roleStr = roles.size > 20
      ? roles.map(r => r.toString()).slice(0, 20).join(', ') + ` +${roles.size - 20} more`
      : roles.map(r => r.toString()).join(', ') || 'None';

    const embed = new EmbedBuilder()
      .setColor(target.displayHexColor || COLORS.INFO)
      .setTitle(`User Info: ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Username', value: user.username, inline: true },
        { name: 'ID', value: user.id, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Joined Server', value: target.joinedTimestamp ? `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
        { name: 'Timed Out', value: target.isCommunicationDisabled() ? `Until <t:${Math.floor(target.communicationDisabledUntilTimestamp / 1000)}:R>` : 'No', inline: true },
        { name: 'Warns', value: String(warns), inline: true },
        { name: 'Bans', value: String(bans), inline: true },
        { name: 'Kicks', value: String(kicks), inline: true },
        { name: `Roles [${roles.size}]`, value: roleStr.slice(0, 1024) },
      )
      .setTimestamp()
      .setFooter({ text: 'Vigil' });
    message.reply({ embeds: [embed] });
  },
};
