const { resolveMember } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'purge',
  aliases: ['clear', 'prune'],
  description: 'Bulk delete messages.',
  usage: 'purge <amount> [--user @user]',
  permissions: ['ManageMessages'],
  cooldown: 5,
  async execute(message, args, client) {
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply({ embeds: [errorEmbed('Please provide a number between 1 and 100.')] });
    }
    let targetUser = null;
    const userFlagIndex = args.indexOf('--user');
    if (userFlagIndex !== -1 && args[userFlagIndex + 1]) {
      const member = await resolveMember(message.guild, args[userFlagIndex + 1]);
      if (member) targetUser = member.id;
    }
    try {
      await message.delete().catch(() => {});
      let messages = await message.channel.messages.fetch({ limit: 100 });
      messages = messages.filter(m => !m.pinned);
      if (targetUser) messages = messages.filter(m => m.author.id === targetUser);
      const toDelete = [...messages.values()].slice(0, amount);
      if (!toDelete.length) return message.channel.send({ embeds: [errorEmbed('No messages to delete.')] }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      const deleted = await message.channel.bulkDelete(toDelete, true);
      const reply = await message.channel.send({ embeds: [successEmbed(`Deleted **${deleted.size}** message(s).`)] });
      setTimeout(() => reply.delete().catch(() => {}), 5000);
    } catch {
      message.channel.send({ embeds: [errorEmbed('Failed to delete messages. Messages older than 14 days cannot be bulk deleted.')] });
    }
  },
};
