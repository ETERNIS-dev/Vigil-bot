module.exports = function ensureAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.redirect('/');
  if (req.user.id !== process.env.OWNER_ID) {
    return res.status(403).render('login', { error: 'Access denied. Owner only.' });
  }
  return next();
};
