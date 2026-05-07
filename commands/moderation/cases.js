const Case = require('../../database/models/Case');
const { resolveMember } = require('../../utils/helpers');
const { errorEmbed } = require('../../utils/embedBuilder');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'cases',
  aliases: [],
  description: 'View all cases for a user.',
  usage: 'cases <@user>',
  permissions: ['ModerateMembers'],
  cooldown: 5,
  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please provide a user.')] });
    const target = await resolveMember(message.guild, args[0]);
    const userId = target ? target.id : args[0].replace(/[<@!>]/g, '');
    const userTag = target ? target.user.tag : userId;
    const allCases = await Case.find({ guildId: message.guild.id, userId }).sort({ caseNumber: -1 });
    if (!allCases.length) return message.reply({ embeds: [errorEmbed(`No cases found for **${userTag}**.`)] });

    const perPage = 5;
    let page = 0;
    const totalPages = Math.ceil(allCases.length / perPage);

    function buildEmbed(p) {
      const slice = allCases.slice(p * perPage, p * perPage + perPage);
      const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`Cases for ${userTag}`)
        .setDescription(`Total: **${allCases.length}** cases`)
        .setFooter({ text: `Page ${p + 1}/${totalPages} • Vigil Moderation` })
        .setTimestamp();
      for (const c of slice) {
        embed.addFields({
          name: `Case #${c.caseNumber} — ${c.type}`,
          value: `**Moderator:** ${c.moderatorTag}\n**Reason:** ${c.reason}\n**Date:** <t:${Math.floor(c.createdAt.getTime() / 1000)}:d>`,
        });
      }
      return embed;
    }

    function buildRow(p) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('◀ Previous').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
        new ButtonBuilder().setCustomId('next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(p >= totalPages - 1),
      );
    }

    const msg = await message.reply({ embeds: [buildEmbed(0)], components: totalPages > 1 ? [buildRow(0)] : [] });
    if (totalPages <= 1) return;

    const collector = msg.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) return i.reply({ content: 'Not your menu.', ephemeral: true });
      if (i.customId === 'prev' && page > 0) page--;
      if (i.customId === 'next' && page < totalPages - 1) page++;
      await i.update({ embeds: [buildEmbed(page)], components: [buildRow(page)] });
    });
    collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
  },
};
