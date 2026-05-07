const { Schema, model } = require('mongoose');

const optionSchema = new Schema({
  emoji: String,
  roleId: String,
  description: String,
}, { _id: false });

const reactionRoleSchema = new Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true },
  embed: {
    title: String,
    description: String,
    color: { type: String, default: '#5865F2' },
    footer: String,
  },
  options: { type: [optionSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('ReactionRole', reactionRoleSchema);
