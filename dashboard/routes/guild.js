const express = require('express');
const router = express.Router();
const ensureAuth = require('../middleware/auth');
const Case = require('../../database/models/Case');
const AutomodConfig = require('../../database/models/AutomodConfig');

function formatUptime(ms) {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

router.get('/:guildId', ensureAuth, async (req, res) => {
  const { guildId } = req.params;
  const client = req.client;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).send('Guild not found.');
  try {
    const totalCases = await Case.countDocuments({ guildId });
    const recentCases = await Case.find({ guildId }).sort({ createdAt: -1 }).limit(8);
    const automod = await AutomodConfig.findOne({ guildId });
    const activeRules = automod ? Object.values(automod.rules || {}).filter(r => r?.enabled).length : 0;
    const totalRules = 10;
    const uptime = client.uptime ? formatUptime(client.uptime) : '—';
    res.render('guild', {
      user: req.user,
      guild: { id: guild.id, name: guild.name, icon: guild.iconURL({ dynamic: true }), memberCount: guild.memberCount },
      totalCases,
      recentCases,
      activeRules,
      totalRules,
      uptime,
    });
  } catch (err) {
    res.status(500).send('Error loading guild.');
  }
});

module.exports = router;
