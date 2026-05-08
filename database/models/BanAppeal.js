const { Schema, model } = require('mongoose');

const banAppealSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  userTag: { type: String, required: true },
  caseNumber: { type: Number, default: null },
  banReason: { type: String, default: 'No reason provided.' },
  appealReason: { type: String, default: null },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  reviewedBy: { type: String, default: null },
  reviewedByTag: { type: String, default: null },
  reviewNote: { type: String, default: null },
  appealChannelMsgId: { type: String, default: null },
  reviewedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

banAppealSchema.index({ guildId: 1, userId: 1 });

module.exports = model('BanAppeal', banAppealSchema);
