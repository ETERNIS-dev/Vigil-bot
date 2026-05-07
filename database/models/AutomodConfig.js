const { Schema, model } = require('mongoose');

const wordGroupSchema = new Schema({
  name: String,
  words: [String],
  punishment: { type: String, default: 'delete' },
  muteDuration: { type: String, default: '10m' },
  alertChannel: { type: String, default: null },
  alertMessage: { type: String, default: '⚠️ {user} used a blocked word.' },
}, { _id: false });

const ruleBase = {
  enabled: { type: Boolean, default: false },
  punishment: { type: String, default: 'delete' },
  muteDuration: { type: String, default: '10m' },
  alertChannel: { type: String, default: null },
};

const automodConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  rules: {
    spam: {
      ...ruleBase,
      maxMessages: { type: Number, default: 5 },
      timeWindow: { type: Number, default: 10 },
      alertMessage: { type: String, default: '⚠️ {user} has been flagged for spam.' },
    },
    channelSpam: {
      ...ruleBase,
      maxChannels: { type: Number, default: 4 },
      timeWindow: { type: Number, default: 10 },
      alertMessage: { type: String, default: '⚠️ {user} is spamming across channels.' },
    },
    mentions: {
      ...ruleBase,
      maxMentions: { type: Number, default: 4 },
      timeWindow: { type: Number, default: 10 },
      alertMessage: { type: String, default: '⚠️ {user} sent {count} mentions.' },
    },
    attachments: {
      ...ruleBase,
      muteDuration: { type: String, default: '5m' },
      maxAttachments: { type: Number, default: 2 },
      timeWindow: { type: Number, default: 10 },
      alertMessage: { type: String, default: '⚠️ {user} sent too many attachments.' },
    },
    emojis: {
      ...ruleBase,
      muteDuration: { type: String, default: '5m' },
      maxEmojis: { type: Number, default: 11 },
      timeWindow: { type: Number, default: 8 },
      alertMessage: { type: String, default: '⚠️ {user} sent too many emojis.' },
    },
    msgLines: {
      enabled: { type: Boolean, default: false },
      warnAt: { type: Number, default: 6 },
      deleteAt: { type: Number, default: 8 },
      timeWindow: { type: Number, default: 12 },
      punishment: { type: String, default: 'delete' },
      alertChannel: { type: String, default: null },
      alertMessage: { type: String, default: '⚠️ {user} sent a message with too many lines.' },
    },
    caps: {
      enabled: { type: Boolean, default: false },
      minChars: { type: Number, default: 20 },
      percentage: { type: Number, default: 80 },
      punishment: { type: String, default: 'delete' },
      muteDuration: { type: String, default: '5m' },
      alertChannel: { type: String, default: null },
      alertMessage: { type: String, default: '⚠️ {user} used excessive caps.' },
    },
    words: {
      enabled: { type: Boolean, default: false },
      groups: { type: [wordGroupSchema], default: [] },
    },
    links: {
      enabled: { type: Boolean, default: false },
      whitelist: { type: [String], default: [] },
      punishment: { type: String, default: 'delete' },
      muteDuration: { type: String, default: '10m' },
      alertChannel: { type: String, default: null },
      alertMessage: { type: String, default: '⚠️ {user} sent a blocked link.' },
    },
    invites: {
      enabled: { type: Boolean, default: false },
      whitelist: { type: [String], default: [] },
      punishment: { type: String, default: 'delete' },
      muteDuration: { type: String, default: '10m' },
      alertChannel: { type: String, default: null },
      alertMessage: { type: String, default: '⚠️ {user} sent a Discord invite.' },
    },
  },
}, { minimize: false });

module.exports = model('AutomodConfig', automodConfigSchema);
