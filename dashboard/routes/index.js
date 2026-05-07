const express = require('express');
const router = express.Router();
const ensureAuth = require('../middleware/auth');

router.get('/', (req, res) => {
  if (req.isAuthenticated() && req.user.id === process.env.OWNER_ID) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
});

router.get('/dashboard', ensureAuth, (req, res) => {
  const client = req.client;
  const guilds = client.guilds.cache.map(g => ({
    id: g.id,
    name: g.name,
    icon: g.iconURL({ dynamic: true }),
    memberCount: g.memberCount,
  }));
  res.render('index', { user: req.user, guilds });
});

module.exports = router;
