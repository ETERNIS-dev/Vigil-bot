const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCase, resolveMember, canModerate, isImmune, expandReason, getGuild, sendPunishmentDM } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');
const BanAppeal = require('../../database/models/BanAppeal');

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
      const id = args[0].replace(/[<@!>]/g, '');
      const reason = await expandReason(message.guild.id, args.slice(1).join(' ') || 'No reason provided.');
      try {
        await message.guild.members.ban(id, { reason, deleteMessageSeconds: 86400 });
        const newCase = await createCase(client, {
          guildId: message.guild.id, type: 'BAN',
          userId: id, userTag: id,
          moderatorId: message.author.id, moderatorTag: message.author.tag,
          reason,
        });
        return message.reply({ embeds: [successEmbed(`Banned user ID \`${id}\`.\n**Reason:** ${reason}`)] });
      } catch {
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
      const guildSettings = await getGuild(message.guild.id);
      const newCase = await createCase(client, {
        guildId: message.guild.id, type: 'BAN',
        userId: target.id, userTag: target.user.tag,
        moderatorId: message.author.id, moderatorTag: message.author.tag,
        reason,
      });

      await sendPunishmentDM(target.user, 'ban', {
        server: message.guild.name,
        reason,
        moderator: message.author.tag,
        caseNumber: newCase.caseNumber,
        guildSettings,
      });

      if (guildSettings.appealSettings?.enabled && guildSettings.punishmentMessages?.ban?.embed?.showAppealInfo !== false) {
        try {
          const appealMsg = guildSettings.appealSettings.appealMessage || 'You may appeal your ban by clicking the button below.';
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`vigil_appeal_submit_${message.guild.id}_${target.id}_${newCase.caseNumber}`)
              .setLabel('📋 Submit Appeal')
              .setStyle(ButtonStyle.Secondary)
          );
          await target.user.send({
            content: `**${message.guild.name}** — Ban Appeal\n${appealMsg.replace(/\{server\}/g, message.guild.name).replace(/\{reason\}/g, reason).replace(/\{caseNumber\}/g, `#${newCase.caseNumber}`)}`,
            components: [row],
          }).catch(() => {});

          await BanAppeal.create({
            guildId: message.guild.id,
            userId: target.id,
            userTag: target.user.tag,
            caseNumber: newCase.caseNumber,
            banReason: reason,
            status: 'pending',
          });
        } catch (_) { /* silent */ }
      }

      await target.ban({ reason, deleteMessageSeconds: 86400 });
      message.reply({ embeds: [successEmbed(`Banned **${target.user.tag}**.\n**Reason:** ${reason}`)] });
    } catch {
      message.reply({ embeds: [errorEmbed('Failed to ban that member.')] });
    }
  },
};
