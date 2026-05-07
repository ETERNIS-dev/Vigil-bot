const { Schema, model } = require('mongoose');

const messageCacheSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  messages: [{
    content: String,
    channelId: String,
    channelName: String,
    timestamp: { type: Date, default: Date.now },
    _id: false,
  }],
});

messageCacheSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = model('MessageCache', messageCacheSchema);
