const { getGuild, resolveMember } = require('../../utils/helpers');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'report',
  aliases: [],
  description: 'Report a user to moderators.',
  usage: 'report <@user> <reason>',
  permissions: [],
  cooldown: 30,
  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please provide a user to report.')] });
    const target = await resolveMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Could not find that member.')] });
    if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('You cannot report yourself.')] });
    const reason = args.slice(1).join(' ');
    if (!reason) return message.reply({ embeds: [errorEmbed('Please provide a reason for the report.')] });

    const reportEmbed = new EmbedBuilder()
      .setColor(COLORS.WARN)
      .setTitle('📋 User Report')
      .addFields(
        { name: 'Reported User', value: `${target.user.tag} (${target.id})`, inline: true },
        { name: 'Reported By', value: `${message.author.tag} (${message.author.id})`, inline: true },
        { name: 'Channel', value: message.channel.toString(), inline: true },
        { name: 'Reason', value: reason },
      )
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: 'Vigil Reports' });

    const guildSettings = await getGuild(message.guild.id);
    let sent = false;

    if (guildSettings.reportsChannel) {
      const ch = message.guild.channels.cache.get(guildSettings.reportsChannel);
      if (ch) {
        await ch.send({ embeds: [reportEmbed] });
        sent = true;
      }
    }

    // DM online members with ManageMessages
    const members = await message.guild.members.fetch();
    const mods = members.filter(m =>
      !m.user.bot &&
      m.presence?.status !== 'offline' &&
      m.permissions.has(PermissionFlagsBits.ManageMessages) &&
      m.id !== message.author.id,
    );
    for (const [, mod] of mods) {
      await mod.user.send({ embeds: [reportEmbed] }).catch(() => {});
    }

    message.reply({ embeds: [successEmbed('Your report has been submitted to the moderation team.')] });
  },
};
