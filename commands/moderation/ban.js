const { PermissionFlagsBits } = require('discord.js');
const { createCase, resolveMember, canModerate, isImmune, expandReason } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'ban',
  aliases: [],
  description: 'Ban a member from the server.',
  usage: 'ban <@user|ID> [reason]',
  permissions: ['BanMembers'],
  cooldown: 5,
  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please provide a user to ban.')] });
    const target = await resolveMember(message.guild, args[0]);
    if (!target) {
      // Try to ban by ID even if not in server
      const id = args[0].replace(/[<@!>]/g, '');
      const reason = await expandReason(message.guild.id, args.slice(1).join(' ') || 'No reason provided.');
      try {
        await message.guild.members.ban(id, { reason, deleteMessageSeconds: 86400 });
        await createCase(client, {
          guildId: message.guild.id, type: 'BAN',
          userId: id, userTag: id,
          moderatorId: message.author.id, moderatorTag: message.author.tag,
          reason,
        });
        return message.reply({ embeds: [successEmbed(`Banned user ID \`${id}\`.\n**Reason:** ${reason}`)] });
      } catch (err) {
        return message.reply({ embeds: [errorEmbed('Could not ban that user.')] });
      }
    }
    const botMember = message.guild.members.me;
    if (!canModerate(message.member, target, botMember)) {
      return message.reply({ embeds: [errorEmbed('You cannot moderate that member.')] });
    }
    if (await isImmune(target, message.guild.id)) {
      return message.reply({ embeds: [errorEmbed('That member is immune from moderation.')] });
    }
    const reason = await expandReason(message.guild.id, args.slice(1).join(' ') || 'No reason provided.');
    try {
      await target.user.send(`🔨 You have been **banned** from **${message.guild.name}**.\n**Reason:** ${reason}`).catch(() => {});
      await target.ban({ reason, deleteMessageSeconds: 86400 });
      await createCase(client, {
        guildId: message.guild.id, type: 'BAN',
        userId: target.id, userTag: target.user.tag,
        moderatorId: message.author.id, moderatorTag: message.author.tag,
        reason,
      });
      message.reply({ embeds: [successEmbed(`Banned **${target.user.tag}**.\n**Reason:** ${reason}`)] });
    } catch (err) {
      message.reply({ embeds: [errorEmbed('Failed to ban that member.')] });
    }
  },
};
