const MessageCache = require('../../database/models/MessageCache');
const { resolveMember } = require('../../utils/helpers');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, errorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'msghistory',
  aliases: ['mh'],
  description: 'View cached message history for a user.',
  usage: 'msghistory <@user>',
  permissions: ['ModerateMembers'],
  cooldown: 5,
  async execute(message, args, client) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Please mention a user.')] });
    const target = await resolveMember(message.guild, args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed('Could not find that member.')] });
    const cache = await MessageCache.findOne({ guildId: message.guild.id, userId: target.id });
    if (!cache || !cache.messages.length) return message.reply({ embeds: [errorEmbed(`No cached messages for **${target.user.tag}**.`)] });

    const msgs = [...cache.messages].reverse();
    const perPage = 5;
    const totalPages = Math.ceil(msgs.length / perPage);
    let page = 0;

    function buildEmbed(p) {
      const slice = msgs.slice(p * perPage, p * perPage + perPage);
      const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`Message History: ${target.user.tag}`)
        .setDescription(`Last ${msgs.length} cached messages`)
        .setFooter({ text: `Page ${p + 1}/${totalPages} • Vigil` })
        .setTimestamp();
      for (const m of slice) {
        embed.addFields({
          name: `#${m.channelName} — <t:${Math.floor(new Date(m.timestamp).getTime() / 1000)}:R>`,
          value: (m.content || '*(empty)*').slice(0, 100),
        });
      }
      return embed;
    }

    function buildRow(p) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
        new ButtonBuilder().setCustomId('next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(p >= totalPages - 1),
      );
    }

    const msg = await message.reply({ embeds: [buildEmbed(0)], components: totalPages > 1 ? [buildRow(0)] : [] });
    if (totalPages <= 1) return;
    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
    collector.on('collect', async i => {
      if (i.customId === 'prev' && page > 0) page--;
      if (i.customId === 'next' && page < totalPages - 1) page++;
      await i.update({ embeds: [buildEmbed(page)], components: [buildRow(page)] });
    });
    collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
  },
};
