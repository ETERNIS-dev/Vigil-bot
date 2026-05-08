const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');
const { getGuild, createCase } = require('../../utils/helpers');
const BanAppeal = require('../../database/models/BanAppeal');
const Guild = require('../../database/models/Guild');

module.exports = {
  name: 'appeals',
  aliases: [],
  description: 'Manage ban appeals.',
  usage: 'appeals [pending|approved|denied] | appeals view <id> | appeals approve <id> [note] | appeals deny <id> <reason>',
  permissions: ['BanMembers'],
  cooldown: 3,
  async execute(message, args, client) {
    const sub = args[0]?.toLowerCase();

    if (!sub || ['pending', 'approved', 'denied'].includes(sub)) {
      const filter = { guildId: message.guild.id };
      if (sub && ['pending', 'approved', 'denied'].includes(sub)) filter.status = sub;
      const appeals = await BanAppeal.find(filter).sort({ createdAt: -1 }).limit(15);
      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle(`⚖️ Ban Appeals${sub ? ` — ${sub.toUpperCase()}` : ''}`)
        .setDescription(appeals.length ? null : 'No appeals found.');
      for (const a of appeals) {
        const statusEmoji = a.status === 'approved' ? '✅' : a.status === 'denied' ? '❌' : '⏳';
        embed.addFields({
          name: `${statusEmoji} ${a.userTag} | Case #${a.caseNumber || 'N/A'} | ID: \`${a._id}\``,
          value: `Status: **${a.status}** | Submitted: <t:${Math.floor(new Date(a.createdAt).getTime() / 1000)}:R>`,
        });
      }
      return message.reply({ embeds: [embed] });
    }

    if (sub === 'view') {
      const id = args[1];
      if (!id) return message.reply({ embeds: [errorEmbed('Please provide an appeal ID.')] });
      const appeal = await BanAppeal.findOne({ _id: id, guildId: message.guild.id }).catch(() => null);
      if (!appeal) return message.reply({ embeds: [errorEmbed('Appeal not found.')] });
      const embed = new EmbedBuilder()
        .setColor(appeal.status === 'approved' ? 0x10b981 : appeal.status === 'denied' ? 0xef4444 : 0xf59e0b)
        .setTitle(`Appeal — ${appeal.userTag}`)
        .addFields(
          { name: 'User', value: `${appeal.userTag} (${appeal.userId})`, inline: true },
          { name: 'Case #', value: String(appeal.caseNumber || 'N/A'), inline: true },
          { name: 'Status', value: appeal.status.toUpperCase(), inline: true },
          { name: 'Ban Reason', value: appeal.banReason || 'N/A' },
          { name: 'Appeal Reason', value: appeal.appealReason || 'Not submitted yet.' },
        );
      if (appeal.reviewedByTag) embed.addFields({ name: 'Reviewed By', value: appeal.reviewedByTag, inline: true });
      if (appeal.reviewNote) embed.addFields({ name: 'Note', value: appeal.reviewNote });
      embed.setTimestamp(new Date(appeal.createdAt));
      return message.reply({ embeds: [embed] });
    }

    if (sub === 'approve') {
      const id = args[1];
      if (!id) return message.reply({ embeds: [errorEmbed('Please provide an appeal ID.')] });
      const appeal = await BanAppeal.findOne({ _id: id, guildId: message.guild.id }).catch(() => null);
      if (!appeal) return message.reply({ embeds: [errorEmbed('Appeal not found.')] });
      if (appeal.status !== 'pending') return message.reply({ embeds: [errorEmbed('This appeal has already been reviewed.')] });
      const note = args.slice(2).join(' ') || null;
      const guildSettings = await getGuild(message.guild.id);

      await BanAppeal.findByIdAndUpdate(id, {
        status: 'approved',
        reviewedBy: message.author.id,
        reviewedByTag: message.author.tag,
        reviewNote: note,
        reviewedAt: new Date(),
      });

      if (guildSettings.appealSettings?.approveAction === 'unban') {
        try {
          await message.guild.members.unban(appeal.userId, `Ban appeal approved by ${message.author.tag}`);
          await createCase(client, {
            guildId: message.guild.id, type: 'UNBAN',
            userId: appeal.userId, userTag: appeal.userTag,
            moderatorId: message.author.id, moderatorTag: message.author.tag,
            reason: `Ban appeal approved by ${message.author.tag}`,
          });
        } catch (_) { /* silent if already unbanned */ }
      }

      const approveMsg = (guildSettings.appealSettings?.approveMessage || 'Your ban appeal has been approved.')
        .replace(/\{server\}/g, message.guild.name)
        .replace(/\{note\}/g, note || '')
        .replace(/\{user\}/g, appeal.userTag);
      const user = await client.users.fetch(appeal.userId).catch(() => null);
      if (user) await user.send(approveMsg).catch(() => {});

      message.reply({ embeds: [successEmbed(`Appeal approved for **${appeal.userTag}**.${guildSettings.appealSettings?.approveAction === 'unban' ? ' User has been unbanned.' : ''}`)] });
    }

    if (sub === 'deny') {
      const id = args[1];
      if (!id) return message.reply({ embeds: [errorEmbed('Please provide an appeal ID.')] });
      const reason = args.slice(2).join(' ');
      if (!reason) return message.reply({ embeds: [errorEmbed('Please provide a denial reason.')] });
      const appeal = await BanAppeal.findOne({ _id: id, guildId: message.guild.id }).catch(() => null);
      if (!appeal) return message.reply({ embeds: [errorEmbed('Appeal not found.')] });
      if (appeal.status !== 'pending') return message.reply({ embeds: [errorEmbed('This appeal has already been reviewed.')] });
      const guildSettings = await getGuild(message.guild.id);

      await BanAppeal.findByIdAndUpdate(id, {
        status: 'denied',
        reviewedBy: message.author.id,
        reviewedByTag: message.author.tag,
        reviewNote: reason,
        reviewedAt: new Date(),
      });

      const denyMsg = (guildSettings.appealSettings?.denyMessage || 'Your ban appeal has been denied.\nReason: {note}')
        .replace(/\{server\}/g, message.guild.name)
        .replace(/\{note\}/g, reason)
        .replace(/\{user\}/g, appeal.userTag);
      const user = await client.users.fetch(appeal.userId).catch(() => null);
      if (user) await user.send(denyMsg).catch(() => {});

      message.reply({ embeds: [successEmbed(`Appeal denied for **${appeal.userTag}**.`)] });
    }
  },
};
