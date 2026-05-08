const express = require('express');
const router = express.Router();
const ensureAuth = require('../middleware/auth');
const AutomodConfig = require('../../database/models/AutomodConfig');
const { invalidateAutomodCache } = require('../../utils/helpers');

router.get('/:guildId/automod', ensureAuth, async (req, res) => {
  const { guildId } = req.params;
  const client = req.client;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).send('Guild not found.');
  let config = await AutomodConfig.findOne({ guildId });
  if (!config) config = await AutomodConfig.create({ guildId });
  const channels = guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name })).sort((a,b) => a.name.localeCompare(b.name));
  res.render('automod', {
    user: req.user,
    guild: { id: guild.id, name: guild.name, icon: guild.iconURL({ dynamic: true }) },
    config,
    channels,
  });
});

router.post('/:guildId/automod/:rule', ensureAuth, async (req, res) => {
  const { guildId, rule } = req.params;
  const body = req.body;
  try {
    const updates = {};
    for (const [key, value] of Object.entries(body)) {
      if (key === 'punishments') {
        let punishments = value;
        if (typeof punishments === 'string') {
          try { punishments = JSON.parse(punishments); } catch { punishments = [{ type: 'delete_all' }]; }
        }
        if (!Array.isArray(punishments)) punishments = [{ type: 'delete_all' }];
        updates[`rules.${rule}.punishments`] = punishments;
      } else if (key === 'whitelist') {
        let list = value;
        if (typeof list === 'string') {
          list = list.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (!Array.isArray(list)) list = [];
        updates[`rules.${rule}.whitelist`] = list;
      } else {
        updates[`rules.${rule}.${key}`] = value === 'true' ? true : value === 'false' ? false : (value === '' ? null : value);
      }
    }
    await AutomodConfig.findOneAndUpdate({ guildId }, { $set: updates }, { upsert: true });
    invalidateAutomodCache(guildId);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
