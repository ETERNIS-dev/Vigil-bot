const { Schema, model } = require('mongoose');

const roleConnectionSchema = new Schema({
  guildId: { type: String, required: true },
  targetRoleId: { type: String, required: true },
  conditionRoleId: { type: String, required: true },
  action: { type: String, enum: ['add', 'remove'], default: 'add' },
});

module.exports = model('RoleConnection', roleConnectionSchema);
