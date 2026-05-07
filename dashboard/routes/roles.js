const express = require('express');
const router = express.Router();
const ensureAuth = require('../middleware/auth');
const Guild = require('../../database/models/Guild');
const ReactionRole = require('../../database/models/ReactionRole');
const { getGuild } = require('../../utils/helpers');
const { EmbedBuilder } = require('discord.js');

router.get('/:guildId/roles', ensureAuth, async (req, res) => {
  const { guildId } = req.params;
  const client = req.client;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).send('Guild not found.');
  const guildSettings = await getGuild(guildId);
  const reactionRoles = await ReactionRole.find({ guildId });
  const channels = guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name }));
  const roles = guild.roles.cache.filter(r => r.id !== guild.id).map(r => ({ id: r.id, name: r.name }));
  res.render('roles', {
    user: req.user,
    guild: { id: guild.id, name: guild.name, icon: guild.iconURL({ dynamic: true }) },
    guildSettings,
    reactionRoles,
    channels,
    roles,
  });
});

router.post('/:guildId/roles/autorole', ensureAuth, async (req, res) => {
  const { guildId } = req.params;
  try {
    const { autoroles, delay } = req.body;
    const roleList = Array.isArray(autoroles) ? autoroles : autoroles ? [autoroles] : [];
    await Guild.findOneAndUpdate({ guildId }, { $set: { autoroles: roleList, autoroleDelay: parseInt(delay) || 0 } }, { upsert: true });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

router.post('/:guildId/roles/reactionrole', ensureAuth, async (req, res) => {
  const { guildId } = req.params;
  const client = req.client;
  try {
    const { channelId, title, description, color, options } = req.body;
    const guild = client.guilds.cache.get(guildId);
    const ch = guild?.channels.cache.get(channelId);
    if (!ch) return res.json({ success: false, error: 'Channel not found.' });
    const parsedOptions = Array.isArray(options) ? options : [];
    const embed = new EmbedBuilder().setColor(color || '#5865F2').setTitle(title || 'Reaction Roles').setDescription(description || '\u200b');
    for (const opt of parsedOptions) {
      if (opt.emoji && opt.roleId) embed.addFields({ name: `${opt.emoji} <@&${opt.roleId}>`, value: opt.description || '\u200b', inline: true });
    }
    const sent = await ch.send({ embeds: [embed] });
    const doc = await ReactionRole.create({ guildId, channelId, messageId: sent.id, embed: { title, description, color }, options: parsedOptions });
    for (const opt of parsedOptions) {
      if (opt.emoji) await sent.react(opt.emoji).catch(() => {});
    }
    res.json({ success: true, id: doc._id });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

router.delete('/:guildId/roles/reactionrole/:id', ensureAuth, async (req, res) => {
  const client = req.client;
  try {
    const doc = await ReactionRole.findByIdAndDelete(req.params.id);
    if (doc) {
      const guild = client.guilds.cache.get(req.params.guildId);
      const ch = guild?.channels.cache.get(doc.channelId);
      if (ch) {
        const msg = await ch.messages.fetch(doc.messageId).catch(() => null);
        if (msg) await msg.reactions.removeAll().catch(() => {});
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
