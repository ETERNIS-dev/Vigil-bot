const express = require('express');
const router = express.Router();
const ensureAuth = require('../middleware/auth');
const WelcomeMessage = require('../../database/models/WelcomeMessage');

router.get('/:guildId/messages', ensureAuth, async (req, res) => {
  const { guildId } = req.params;
  const client = req.client;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).send('Guild not found.');
  const join = await WelcomeMessage.find({ guildId, type: 'join' });
  const leave = await WelcomeMessage.find({ guildId, type: 'leave' });
  const boost = await WelcomeMessage.find({ guildId, type: 'boost' });
  const rolemsg = await WelcomeMessage.find({ guildId, type: 'rolemsg' });
  const channels = guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name }));
  const roles = guild.roles.cache.filter(r => r.id !== guild.id).map(r => ({ id: r.id, name: r.name }));
  res.render('messages', {
    user: req.user,
    guild: { id: guild.id, name: guild.name, icon: guild.iconURL({ dynamic: true }) },
    join, leave, boost, rolemsg, channels, roles,
    activeTab: req.query.tab || 'join',
  });
});

router.post('/:guildId/messages', ensureAuth, async (req, res) => {
  const { guildId } = req.params;
  try {
    const { _id, name, type, channelId, useEmbed, color, title, description, footer, image, pingUser, plainMessage, roleCondition, roleAction } = req.body;
    const data = {
      guildId, name, type, channelId, pingUser: pingUser === 'true',
      embed: { useEmbed: useEmbed === 'true', color: color || '#5865F2', title, description, footer, image, thumbnail: true, fields: [] },
      plainMessage: useEmbed === 'true' ? null : plainMessage,
      roleCondition: roleCondition || null,
      roleAction: roleAction || null,
    };
    if (_id) {
      await WelcomeMessage.findByIdAndUpdate(_id, data);
    } else {
      await WelcomeMessage.create(data);
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

router.delete('/:guildId/messages/:id', ensureAuth, async (req, res) => {
  try {
    await WelcomeMessage.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
