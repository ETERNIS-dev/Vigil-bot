const LogConfig = require('../database/models/LogConfig');
const { logEmbed, COLORS } = require('../utils/embedBuilder');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;
    try {
      const logConfig = await LogConfig.findOne({ guildId: message.guild.id });
      if (!logConfig?.channels?.messages) return;
      const ch = message.guild.channels.cache.get(logConfig.channels.messages);
      if (!ch) return;
      const embed = logEmbed({
        type: 'MSG_DELETE',
        title: 'Message Deleted',
        color: COLORS.LOG_MSG,
        user: message.author,
        fields: [
          { name: 'Author', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown', inline: true },
          { name: 'Channel', value: message.channel.toString(), inline: true },
          { name: 'Content', value: (message.content || 'Unknown/empty').slice(0, 1024) },
        ],
      });
      await ch.send({ embeds: [embed] });
    } catch (_) { /* silent */ }
  },
};
