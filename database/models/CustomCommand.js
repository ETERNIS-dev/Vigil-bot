const { Schema, model } = require('mongoose');

const customCommandSchema = new Schema({
  guildId: { type: String, required: true },
  name: { type: String, required: true },
  response: { type: String, required: true },
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('CustomCommand', customCommandSchema);
