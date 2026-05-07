const { Schema, model } = require('mongoose');

const caseSchema = new Schema({
  guildId: { type: String, required: true },
  caseNumber: { type: Number, required: true },
  type: {
    type: String,
    enum: [
      'BAN', 'UNBAN', 'KICK', 'MUTE', 'UNMUTE', 'WARN', 'LOCK',
      'AUTOMOD_SPAM', 'AUTOMOD_CAPS', 'AUTOMOD_WORDS', 'AUTOMOD_LINKS',
      'AUTOMOD_INVITES', 'AUTOMOD_MENTIONS', 'AUTOMOD_ATTACHMENTS',
      'AUTOMOD_EMOJIS', 'AUTOMOD_LINES', 'AUTOMOD_CHANNELSPAM',
    ],
    required: true,
  },
  userId: { type: String, required: true },
  userTag: String,
  moderatorId: String,
  moderatorTag: String,
  reason: { type: String, default: 'No reason provided.' },
  duration: { type: String, default: null },
  expiresAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

caseSchema.statics.nextCaseNumber = async function (guildId) {
  const last = await this.findOne({ guildId }).sort({ caseNumber: -1 });
  return last ? last.caseNumber + 1 : 1;
};

module.exports = model('Case', caseSchema);
