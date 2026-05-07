const { Schema, model } = require('mongoose');

const templateSchema = new Schema({
  guildId: { type: String, required: true },
  name: { type: String, required: true },
  content: { type: String, required: true },
  createdBy: String,
});

module.exports = model('Template', templateSchema);
