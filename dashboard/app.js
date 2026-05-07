const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy: DiscordStrategy } = require('passport-discord');
const MongoStore = require('connect-mongo');
const path = require('path');

module.exports = function (client) {
  const app = express();

  passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify', 'guilds'],
  }, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }));

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'vigil-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 60 * 60 * 24 * 1000 },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  app.use((req, res, next) => { req.client = client; next(); });

  app.use('/', require('./routes/auth')(passport));
  app.use('/', require('./routes/index'));
  app.use('/dashboard', require('./routes/guild'));
  app.use('/dashboard', require('./routes/automod'));
  app.use('/dashboard', require('./routes/moderation'));
  app.use('/dashboard', require('./routes/logging'));
  app.use('/dashboard', require('./routes/messages'));
  app.use('/dashboard', require('./routes/roles'));

  const port = process.env.DASHBOARD_PORT || 3000;
  app.listen(port, () => console.log(`[Vigil] Dashboard running on port ${port}`));
};
