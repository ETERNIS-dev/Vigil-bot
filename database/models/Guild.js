const { Schema, model } = require('mongoose');

const warnThresholdSchema = new Schema({
  warnCount: Number,
  timeWindowDays: Number,
  punishment: String,
  muteDuration: String,
}, { _id: false });

const punishEmbedSchema = (defaults) => ({
  useEmbed: { type: Boolean, default: true },
  color: { type: String, default: defaults.color },
  title: { type: String, default: defaults.title },
  description: { type: String, default: defaults.description },
  footer: { type: String, default: '' },
  showReason: { type: Boolean, default: true },
  showModerator: { type: Boolean, default: false },
  showServer: { type: Boolean, default: true },
  showTimestamp: { type: Boolean, default: true },
  ...(defaults.extra || {}),
});

const guildSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: 'v!' },
  modLogChannel: { type: String, default: null },
  reportsChannel: { type: String, default: null },
  muteRole: { type: String, default: null },
  autoroles: { type: [String], default: [] },
  autoroleDelay: { type: Number, default: 0 },
  reasonAliases: { type: Map, of: String, default: {} },
  warnThresholds: { type: [warnThresholdSchema], default: [] },

  punishmentMessages: {
    warn: {
      enabled: { type: Boolean, default: true },
      embed: {
        ...punishEmbedSchema({
          color: '#f1c40f',
          title: '⚠️ You have been warned',
          description: 'You have been warned in **{server}**.',
        }),
      },
    },
    mute: {
      enabled: { type: Boolean, default: true },
      embed: {
        ...punishEmbedSchema({
          color: '#f39c12',
          title: '🔇 You have been muted',
          description: 'You have been muted in **{server}**.',
          extra: {
            showDuration: { type: Boolean, default: true },
            showExpiry: { type: Boolean, default: true },
          },
        }),
      },
    },
    kick: {
      enabled: { type: Boolean, default: true },
      embed: {
        ...punishEmbedSchema({
          color: '#e67e22',
          title: '👢 You have been kicked',
          description: 'You have been kicked from **{server}**.',
        }),
      },
    },
    ban: {
      enabled: { type: Boolean, default: true },
      embed: {
        ...punishEmbedSchema({
          color: '#e74c3c',
          title: '🔨 You have been banned',
          description: 'You have been banned from **{server}**.',
          extra: {
            showAppealInfo: { type: Boolean, default: true },
          },
        }),
      },
    },
    unban: {
      enabled: { type: Boolean, default: true },
      embed: {
        ...punishEmbedSchema({
          color: '#2ecc71',
          title: '✅ You have been unbanned',
          description: 'Your ban in **{server}** has been lifted.',
        }),
      },
    },
  },

  appealSettings: {
    enabled: { type: Boolean, default: false },
    appealChannelId: { type: String, default: null },
    appealMessage: { type: String, default: 'You may appeal your ban by clicking the button below.' },
    approveAction: { type: String, default: 'unban' },
    approveMessage: { type: String, default: 'Your ban appeal in **{server}** has been approved.' },
    denyMessage: { type: String, default: 'Your ban appeal in **{server}** has been denied.\nReason: {note}' },
  },
}, { minimize: false });

module.exports = model('Guild', guildSchema);
