const express = require('express');
const router = express.Router();
const ensureAuth = require('../middleware/auth');
const BanAppeal = require('../../database/models/BanAppeal');
const Guild = require('../../database/models/Guild');
const { getGuild, createCase } = require('../../utils/helpers');

router.get('/:guildId/appeals', ensureAuth, async (req, res) => {
  const { guildId } = req.params;
  const client = req.client;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).send('Guild not found.');
  const filter = { guildId };
  if (req.query.status) filter.status = req.query.status;
  const appeals = await BanAppeal.find(filter).sort({ createdAt: -1 });
  const guildSettings = await getGuild(guildId);
  const channels = guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name })).sort((a,b) => a.name.localeCompare(b.name));
  const pending = await BanAppeal.countDocuments({ guildId, status: 'pending' });
  const approved = await BanAppeal.countDocuments({ guildId, status: 'approved' });
  const denied = await BanAppeal.countDocuments({ guildId, status: 'denied' });
  res.render('appeals', {
    user: req.user,
    guild: { id: guild.id, name: guild.name, icon: guild.iconURL({ dynamic: true }) },
    appeals,
    guildSettings,
    channels,
    activeStatus: req.query.status || 'all',
    stats: { pending, approved, denied },
  });
});

router.post('/:guildId/appeals/:appealId/approve', ensureAuth, async (req, res) => {
  const { guildId, appealId } = req.params;
  const { note } = req.body;
  const client = req.client;
  try {
    const appeal = await BanAppeal.findOne({ _id: appealId, guildId });
    if (!appeal) return res.json({ success: false, error: 'Appeal not found.' });
    if (appeal.status !== 'pending') return res.json({ success: false, error: 'Appeal already reviewed.' });

    await BanAppeal.findByIdAndUpdate(appealId, {
      status: 'approved',
      reviewedBy: req.user.id,
      reviewedByTag: req.user.username,
      reviewNote: note || null,
      reviewedAt: new Date(),
    });

    const guildSettings = await getGuild(guildId);
    const guild = client.guilds.cache.get(guildId);

    if (guildSettings.appealSettings?.approveAction === 'unban' && guild) {
      try {
        await guild.members.unban(appeal.userId, `Ban appeal approved via dashboard by ${req.user.username}`);
        await createCase(client, {
          guildId, type: 'UNBAN',
          userId: appeal.userId, userTag: appeal.userTag,
          moderatorId: client.user.id, moderatorTag: client.user.tag,
          reason: `Ban appeal approved by ${req.user.username}`,
        });
      } catch (_) { /* silent */ }
    }

    const approveMsg = (guildSettings.appealSettings?.approveMessage || 'Your ban appeal has been approved.')
      .replace(/\{server\}/g, guild?.name || 'the server')
      .replace(/\{note\}/g, note || '')
      .replace(/\{user\}/g, appeal.userTag);
    const user = await client.users.fetch(appeal.userId).catch(() => null);
    if (user) await user.send(approveMsg).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

router.post('/:guildId/appeals/:appealId/deny', ensureAuth, async (req, res) => {
  const { guildId, appealId } = req.params;
  const { reason } = req.body;
  const client = req.client;
  if (!reason) return res.json({ success: false, error: 'Reason is required.' });
  try {
    const appeal = await BanAppeal.findOne({ _id: appealId, guildId });
    if (!appeal) return res.json({ success: false, error: 'Appeal not found.' });
    if (appeal.status !== 'pending') return res.json({ success: false, error: 'Appeal already reviewed.' });

    await BanAppeal.findByIdAndUpdate(appealId, {
      status: 'denied',
      reviewedBy: req.user.id,
      reviewedByTag: req.user.username,
      reviewNote: reason,
      reviewedAt: new Date(),
    });

    const guildSettings = await getGuild(guildId);
    const guild = client.guilds.cache.get(guildId);
    const denyMsg = (guildSettings.appealSettings?.denyMessage || 'Your ban appeal has been denied.\nReason: {note}')
      .replace(/\{server\}/g, guild?.name || 'the server')
      .replace(/\{note\}/g, reason)
      .replace(/\{user\}/g, appeal.userTag);
    const user = await client.users.fetch(appeal.userId).catch(() => null);
    if (user) await user.send(denyMsg).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

router.post('/:guildId/appeals/settings', ensureAuth, async (req, res) => {
  const { guildId } = req.params;
  try {
    const { enabled, appealChannelId, appealMessage, approveAction, approveMessage, denyMessage } = req.body;
    await Guild.findOneAndUpdate({ guildId }, {
      $set: {
        'appealSettings.enabled': enabled === 'true',
        'appealSettings.appealChannelId': appealChannelId || null,
        'appealSettings.appealMessage': appealMessage || '',
        'appealSettings.approveAction': approveAction || 'unban',
        'appealSettings.approveMessage': approveMessage || '',
        'appealSettings.denyMessage': denyMessage || '',
      }
    }, { upsert: true });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
