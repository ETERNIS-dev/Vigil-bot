const { Schema, model } = require('mongoose');

const immuneRoleSchema = new Schema({
  guildId: { type: String, required: true },
  roleId: { type: String, required: true },
});

immuneRoleSchema.index({ guildId: 1, roleId: 1 }, { unique: true });

module.exports = model('ImmuneRole', immuneRoleSchema);
