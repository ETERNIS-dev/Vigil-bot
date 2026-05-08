const { EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'clean',
  aliases: ['clear'],
  description: 'Delete the last X messages in the channel.',
  usage: 'clean <1-100>',
  permissions: ['ManageMessages'],
  cooldown: 5,
  async execute(message, args) {
    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100) {
      return message.reply({ embeds: [errorEmbed('Please provide a number between 1 and 100.')] });
    }

    const fetched = await message.channel.messages.fetch({ limit: Math.min(amount + 10, 100) }).catch(() => null);
    if (!fetched) return message.reply({ embeds: [errorEmbed('Failed to fetch messages.')] });

    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const toDelete = fetched
      .filter(m => !m.pinned && m.createdTimestamp > fourteenDaysAgo)
      .first(amount);

    if (!toDelete.length) {
      return message.reply({ embeds: [errorEmbed('No deletable messages found (messages may be pinned or older than 14 days).')] });
    }

    try {
      const deleted = await message.channel.bulkDelete(toDelete, true);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setDescription(`🗑️ Cleaned **${deleted.size}** messages from ${message.channel}\n**Requested by:** ${message.author.tag}`)
        .setTimestamp();
      const reply = await message.channel.send({ embeds: [embed] });
      setTimeout(() => reply.delete().catch(() => {}), 5000);
    } catch {
      message.reply({ embeds: [errorEmbed('Failed to delete messages.')] });
    }
  },
};
