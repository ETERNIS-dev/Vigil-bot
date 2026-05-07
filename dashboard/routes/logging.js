const express = require('express');
const router = express.Router();
const ensureAuth = require('../middleware/auth');
const LogConfig = require('../../database/models/LogConfig');

router.get('/:guildId/logging', ensureAuth, async (req, res) => {
  const { guildId } = req.params;
  const client = req.client;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).send('Guild not found.');
  let config = await LogConfig.findOne({ guildId });
  if (!config) config = { channels: {} };
  const channels = guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name }));
  res.render('logging', {
    user: req.user,
    guild: { id: guild.id, name: guild.name, icon: guild.iconURL({ dynamic: true }) },
    config,
    channels,
  });
});

router.post('/:guildId/logging', ensureAuth, async (req, res) => {
  const { guildId } = req.params;
  try {
    const updates = {};
    const categories = ['moderation', 'messages', 'members', 'channels', 'roles', 'voice', 'invites', 'server'];
    for (const cat of categories) {
      updates[`channels.${cat}`] = req.body[cat] || null;
    }
    await LogConfig.findOneAndUpdate({ guildId }, { $set: updates }, { upsert: true });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
