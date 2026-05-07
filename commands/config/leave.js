const WelcomeMessage = require('../../database/models/WelcomeMessage');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'leave',
  aliases: [],
  description: 'Manage leave messages.',
  usage: 'leave <list|create|edit|delete|toggle|test> [name]',
  permissions: ['ManageGuild'],
  cooldown: 5,
  async execute(message, args, client) {
    const sub = args[0]?.toLowerCase();
    const name = args.slice(1).join(' ');
    const guildId = message.guild.id;
    if (sub === 'list') {
      const msgs = await WelcomeMessage.find({ guildId, type: 'leave' });
      if (!msgs.length) return message.reply({ embeds: [infoEmbed('Leave Messages', 'No leave messages configured.')] });
      return message.reply({ embeds: [infoEmbed('Leave Messages', msgs.map(m => `**${m.name}** — <#${m.channelId}> — ${m.enabled ? '✅' : '❌'}`).join('\n'))] });
    }
    if (sub === 'create') {
      if (!name) return message.reply({ embeds: [errorEmbed('Provide a name.')] });
      const chReply = await collectReply(message.channel, message.author.id, 'Which channel for leave messages? (mention)');
      if (!chReply) return;
      const ch = message.guild.channels.cache.get(chReply.replace(/[<#>]/g, ''));
      if (!ch) return message.channel.send({ embeds: [errorEmbed('Channel not found.')] });
      const text = await collectReply(message.channel, message.author.id, 'Leave message text? Supports {username} {tag} {server} {memberCount}');
      await WelcomeMessage.create({ guildId, type: 'leave', name, channelId: ch.id, embed: { useEmbed: false }, plainMessage: text || '{username} has left the server.' });
      return message.channel.send({ embeds: [successEmbed(`Leave message **${name}** created.`)] });
    }
    if (sub === 'delete') {
      await WelcomeMessage.findOneAndDelete({ guildId, type: 'leave', name });
      return message.reply({ embeds: [successEmbed(`Deleted leave message **${name}**.`)] });
    }
    if (sub === 'toggle') {
      const msg = await WelcomeMessage.findOne({ guildId, type: 'leave', name });
      if (!msg) return message.reply({ embeds: [errorEmbed('Not found.')] });
      msg.enabled = !msg.enabled; await msg.save();
      return message.reply({ embeds: [successEmbed(`Leave message **${name}** ${msg.enabled ? 'enabled' : 'disabled'}.`)] });
    }
    if (sub === 'test') {
      const { sendWelcomeMessages } = require('../../utils/helpers');
      await sendWelcomeMessages(client, message.member, 'leave');
      return message.reply({ embeds: [successEmbed('Test sent.')] });
    }
    message.reply({ embeds: [errorEmbed('Usage: `leave <list|create|delete|toggle|test>`')] });
  },
};

async function collectReply(channel, userId, prompt) {
  await channel.send(prompt);
  const c = await channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 60000, errors: ['time'] }).catch(() => null);
  if (!c) return null;
  const m = c.first(); m.delete().catch(() => {}); return m.content;
}
