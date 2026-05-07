const WelcomeMessage = require('../../database/models/WelcomeMessage');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

async function collectReply(channel, userId, prompt) {
  await channel.send(prompt);
  const c = await channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 60000, errors: ['time'] }).catch(() => null);
  if (!c) return null;
  const m = c.first(); m.delete().catch(() => {}); return m.content;
}

module.exports = {
  name: 'rolemsg',
  aliases: [],
  description: 'Manage role assignment messages.',
  usage: 'rolemsg <list|create|edit|delete|toggle|test> [name]',
  permissions: ['ManageGuild'],
  cooldown: 5,
  async execute(message, args, client) {
    const sub = args[0]?.toLowerCase();
    const name = args.slice(1).join(' ');
    const guildId = message.guild.id;
    if (sub === 'list') {
      const msgs = await WelcomeMessage.find({ guildId, type: 'rolemsg' });
      if (!msgs.length) return message.reply({ embeds: [infoEmbed('Role Messages', 'None configured.')] });
      return message.reply({ embeds: [infoEmbed('Role Messages', msgs.map(m => `**${m.name}** — Role: <@&${m.roleCondition}> (${m.roleAction}) — <#${m.channelId}> — ${m.enabled ? '✅' : '❌'}`).join('\n'))] });
    }
    if (sub === 'create') {
      if (!name) return message.reply({ embeds: [errorEmbed('Provide a name.')] });
      const roleReply = await collectReply(message.channel, message.author.id, 'Which role should trigger this message? (mention)');
      if (!roleReply) return;
      const roleId = roleReply.replace(/[<@&>]/g, '');
      const role = message.guild.roles.cache.get(roleId);
      if (!role) return message.channel.send({ embeds: [errorEmbed('Role not found.')] });
      const action = await collectReply(message.channel, message.author.id, 'Trigger on role "add" or "remove"?');
      if (!['add', 'remove'].includes(action?.toLowerCase())) return message.channel.send({ embeds: [errorEmbed('Must be "add" or "remove".')] });
      const chReply = await collectReply(message.channel, message.author.id, 'Which channel to send the message in? (mention)');
      if (!chReply) return;
      const ch = message.guild.channels.cache.get(chReply.replace(/[<#>]/g, ''));
      if (!ch) return message.channel.send({ embeds: [errorEmbed('Channel not found.')] });
      const text = await collectReply(message.channel, message.author.id, 'Message text? Supports {user} {username} {server} {roleAdded} {roleRemoved}');
      await WelcomeMessage.create({ guildId, type: 'rolemsg', name, channelId: ch.id, roleCondition: role.id, roleAction: action.toLowerCase(), embed: { useEmbed: false }, plainMessage: text || '{user} role updated.' });
      return message.channel.send({ embeds: [successEmbed(`Role message **${name}** created.`)] });
    }
    if (sub === 'delete') {
      await WelcomeMessage.findOneAndDelete({ guildId, type: 'rolemsg', name });
      return message.reply({ embeds: [successEmbed(`Deleted role message **${name}**.`)] });
    }
    if (sub === 'toggle') {
      const msg = await WelcomeMessage.findOne({ guildId, type: 'rolemsg', name });
      if (!msg) return message.reply({ embeds: [errorEmbed('Not found.')] });
      msg.enabled = !msg.enabled; await msg.save();
      return message.reply({ embeds: [successEmbed(`Role message **${name}** ${msg.enabled ? 'enabled' : 'disabled'}.`)] });
    }
    message.reply({ embeds: [errorEmbed('Usage: `rolemsg <list|create|delete|toggle>`')] });
  },
};
