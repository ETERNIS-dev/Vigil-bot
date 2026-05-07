const WelcomeMessage = require('../../database/models/WelcomeMessage');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

async function collectReply(channel, userId, prompt, timeout = 60000) {
  await channel.send(prompt);
  const collected = await channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: timeout, errors: ['time'] }).catch(() => null);
  if (!collected) return null;
  const msg = collected.first();
  msg.delete().catch(() => {});
  return msg.content;
}

async function buildWelcomeEntry(message, guildId, type, existing = null) {
  const ch = message.channel;
  const uid = message.author.id;
  const entry = existing ? JSON.parse(JSON.stringify(existing.toObject ? existing.toObject() : existing)) : { guildId, type, embed: { useEmbed: true, fields: [] } };

  const channelReply = await collectReply(ch, uid, '📌 Which channel should this message be sent in? (mention it)');
  if (!channelReply) return null;
  const channelId = channelReply.replace(/[<#>]/g, '');
  const targetCh = message.guild.channels.cache.get(channelId);
  if (!targetCh) { await ch.send({ embeds: [errorEmbed('Channel not found. Cancelled.')] }); return null; }
  entry.channelId = targetCh.id;

  const useEmbed = await collectReply(ch, uid, '📌 Should this use an embed? (yes/no)');
  if (!useEmbed) return null;
  entry.embed.useEmbed = useEmbed.toLowerCase() === 'yes';

  if (entry.embed.useEmbed) {
    const title = await collectReply(ch, uid, '📌 Embed title? (type or say "skip")');
    if (title && title.toLowerCase() !== 'skip') entry.embed.title = title;
    const desc = await collectReply(ch, uid, '📌 Embed description? Supports {user} {username} {server} {memberCount}');
    if (desc) entry.embed.description = desc;
    const color = await collectReply(ch, uid, '📌 Embed color? (hex like #5865F2 or "skip")');
    if (color && color.toLowerCase() !== 'skip') entry.embed.color = color;
    const thumbnail = await collectReply(ch, uid, '📌 Show user avatar as thumbnail? (yes/no)');
    entry.embed.thumbnail = thumbnail?.toLowerCase() === 'yes';
    const footer = await collectReply(ch, uid, '📌 Embed footer text? (type or "skip")');
    if (footer && footer.toLowerCase() !== 'skip') entry.embed.footer = footer;
    const image = await collectReply(ch, uid, '📌 Banner image URL? (type or "skip")');
    if (image && image.toLowerCase() !== 'skip') entry.embed.image = image;
    const addFields = await collectReply(ch, uid, '📌 Add embed fields? (yes/no)');
    entry.embed.fields = [];
    if (addFields?.toLowerCase() === 'yes') {
      let more = true;
      while (more) {
        const fname = await collectReply(ch, uid, '📌 Field name?');
        const fvalue = await collectReply(ch, uid, '📌 Field value?');
        const finline = await collectReply(ch, uid, '📌 Inline? (yes/no)');
        if (fname && fvalue) entry.embed.fields.push({ name: fname, value: fvalue, inline: finline?.toLowerCase() === 'yes' });
        const another = await collectReply(ch, uid, '📌 Add another field? (yes/no)');
        more = another?.toLowerCase() === 'yes';
      }
    }
  } else {
    const plain = await collectReply(ch, uid, '📌 What plain text message should be sent?');
    entry.plainMessage = plain || '';
  }

  const ping = await collectReply(ch, uid, '📌 Should I ping the user in the message? (yes/no)');
  entry.pingUser = ping?.toLowerCase() === 'yes';
  return entry;
}

module.exports = {
  name: 'welcome',
  aliases: [],
  description: 'Manage join messages.',
  usage: 'welcome <list|create|edit|delete|toggle|test> [name]',
  permissions: ['ManageGuild'],
  cooldown: 5,
  async execute(message, args, client) {
    const sub = args[0]?.toLowerCase();
    const name = args.slice(1).join(' ');
    const guildId = message.guild.id;
    if (sub === 'list') {
      const msgs = await WelcomeMessage.find({ guildId, type: 'join' });
      if (!msgs.length) return message.reply({ embeds: [infoEmbed('Join Messages', 'No join messages configured.')] });
      const list = msgs.map(m => `**${m.name}** — <#${m.channelId}> — ${m.enabled ? '✅' : '❌'}`).join('\n');
      return message.reply({ embeds: [infoEmbed('Join Messages', list)] });
    }
    if (sub === 'create') {
      if (!name) return message.reply({ embeds: [errorEmbed('Please provide a name.')] });
      const exists = await WelcomeMessage.findOne({ guildId, type: 'join', name });
      if (exists) return message.reply({ embeds: [errorEmbed('A message with that name already exists.')] });
      await message.reply({ embeds: [infoEmbed('Creating Join Message', 'Respond to each prompt in this channel. You have 60s per step.')] });
      const entry = await buildWelcomeEntry(message, guildId, 'join');
      if (!entry) return;
      await WelcomeMessage.create({ ...entry, name, type: 'join' });
      return message.channel.send({ embeds: [successEmbed(`Join message **${name}** created.`)] });
    }
    if (sub === 'edit') {
      if (!name) return message.reply({ embeds: [errorEmbed('Please provide a name.')] });
      const existing = await WelcomeMessage.findOne({ guildId, type: 'join', name });
      if (!existing) return message.reply({ embeds: [errorEmbed(`No join message named **${name}** found.`)] });
      await message.reply({ embeds: [infoEmbed('Editing Join Message', 'Answer each prompt to update settings.')] });
      const entry = await buildWelcomeEntry(message, guildId, 'join', existing);
      if (!entry) return;
      await WelcomeMessage.updateOne({ _id: existing._id }, { $set: entry });
      return message.channel.send({ embeds: [successEmbed(`Join message **${name}** updated.`)] });
    }
    if (sub === 'delete') {
      if (!name) return message.reply({ embeds: [errorEmbed('Please provide a name.')] });
      const deleted = await WelcomeMessage.findOneAndDelete({ guildId, type: 'join', name });
      if (!deleted) return message.reply({ embeds: [errorEmbed(`No join message named **${name}** found.`)] });
      return message.reply({ embeds: [successEmbed(`Deleted join message **${name}**.`)] });
    }
    if (sub === 'toggle') {
      if (!name) return message.reply({ embeds: [errorEmbed('Please provide a name.')] });
      const msg = await WelcomeMessage.findOne({ guildId, type: 'join', name });
      if (!msg) return message.reply({ embeds: [errorEmbed(`No join message named **${name}** found.`)] });
      msg.enabled = !msg.enabled;
      await msg.save();
      return message.reply({ embeds: [successEmbed(`Join message **${name}** ${msg.enabled ? 'enabled' : 'disabled'}.`)] });
    }
    if (sub === 'test') {
      if (!name) return message.reply({ embeds: [errorEmbed('Please provide a name.')] });
      const msg = await WelcomeMessage.findOne({ guildId, type: 'join', name });
      if (!msg) return message.reply({ embeds: [errorEmbed(`No join message named **${name}** found.`)] });
      const { sendWelcomeMessages } = require('../../utils/helpers');
      await sendWelcomeMessages(client, message.member, 'join');
      return message.reply({ embeds: [successEmbed(`Test sent for **${name}**.`)] });
    }
    message.reply({ embeds: [errorEmbed('Usage: `welcome <list|create|edit|delete|toggle|test> [name]`')] });
  },
};
