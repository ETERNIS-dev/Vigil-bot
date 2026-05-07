const { Schema, model } = require('mongoose');

const logConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  channels: {
    moderation: { type: String, default: null },
    messages: { type: String, default: null },
    members: { type: String, default: null },
    channels: { type: String, default: null },
    roles: { type: String, default: null },
    voice: { type: String, default: null },
    invites: { type: String, default: null },
    server: { type: String, default: null },
  },
}, { minimize: false });

module.exports = model('LogConfig', logConfigSchema);
