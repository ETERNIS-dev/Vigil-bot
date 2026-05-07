const express = require('express');
const router = express.Router();
const ensureAuth = require('../middleware/auth');
const Case = require('../../database/models/Case');

router.get('/:guildId/moderation', ensureAuth, async (req, res) => {
  const { guildId } = req.params;
  const client = req.client;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).send('Guild not found.');
  const page = Math.max(0, parseInt(req.query.page || '0'));
  const perPage = 20;
  const filter = { guildId };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.moderatorId) filter.moderatorId = req.query.moderatorId;
  if (req.query.search) {
    filter.$or = [
      { userTag: { $regex: req.query.search, $options: 'i' } },
      { moderatorTag: { $regex: req.query.search, $options: 'i' } },
      { userId: req.query.search },
    ];
  }
  const totalCases = await Case.countDocuments(filter);
  const cases = await Case.find(filter).sort({ createdAt: -1 }).skip(page * perPage).limit(perPage);
  res.render('moderation', {
    user: req.user,
    guild: { id: guild.id, name: guild.name, icon: guild.iconURL({ dynamic: true }) },
    cases,
    page,
    totalPages: Math.ceil(totalCases / perPage),
    totalCases,
    query: req.query,
  });
});

router.delete('/:guildId/moderation/:caseNumber', ensureAuth, async (req, res) => {
  const { guildId, caseNumber } = req.params;
  try {
    await Case.findOneAndDelete({ guildId, caseNumber: parseInt(caseNumber) });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
