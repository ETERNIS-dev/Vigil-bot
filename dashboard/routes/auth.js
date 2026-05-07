const express = require('express');
const router = express.Router();

module.exports = function (passport) {
  router.get('/auth/discord', passport.authenticate('discord'));

  router.get('/auth/callback', passport.authenticate('discord', {
    failureRedirect: '/',
  }), (req, res) => {
    res.redirect('/dashboard');
  });

  router.get('/auth/logout', (req, res, next) => {
    req.logout(err => {
      if (err) return next(err);
      res.redirect('/');
    });
  });

  return router;
};
