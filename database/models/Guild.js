const { Schema, model } = require('mongoose');

const warnThresholdSchema = new Schema({
  warnCount: Number,
  timeWindowDays: Number,
  punishment: String,
  muteDuration: String,
}, { _id: false });

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
});

module.exports = model('Guild', guildSchema);
