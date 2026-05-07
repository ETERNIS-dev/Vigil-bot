const { Schema, model } = require('mongoose');

const fieldSchema = new Schema({
  name: String,
  value: String,
  inline: Boolean,
}, { _id: false });

const welcomeMessageSchema = new Schema({
  guildId: { type: String, required: true },
  type: { type: String, enum: ['join', 'leave', 'boost', 'rolemsg'], required: true },
  enabled: { type: Boolean, default: true },
  name: { type: String, required: true },
  channelId: { type: String, required: true },
  embed: {
    useEmbed: { type: Boolean, default: true },
    color: { type: String, default: '#5865F2' },
    title: String,
    description: String,
    thumbnail: { type: Boolean, default: true },
    footer: String,
    image: { type: String, default: null },
    fields: { type: [fieldSchema], default: [] },
  },
  plainMessage: { type: String, default: null },
  roleCondition: { type: String, default: null },
  roleAction: { type: String, default: null },
  pingUser: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { minimize: false });

module.exports = model('WelcomeMessage', welcomeMessageSchema);
