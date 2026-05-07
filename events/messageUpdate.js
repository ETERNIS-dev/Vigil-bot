const LogConfig = require('../database/models/LogConfig');
const { logEmbed, COLORS } = require('../utils/embedBuilder');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    try {
      const logConfig = await LogConfig.findOne({ guildId: newMessage.guild.id });
      if (!logConfig?.channels?.messages) return;
      const ch = newMessage.guild.channels.cache.get(logConfig.channels.messages);
      if (!ch) return;
      const embed = logEmbed({
        type: 'MSG_EDIT',
        title: 'Message Edited',
        color: COLORS.LOG_MSG,
        user: newMessage.author,
        fields: [
          { name: 'Author', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
          { name: 'Channel', value: newMessage.channel.toString(), inline: true },
          { name: 'Before', value: (oldMessage.content || 'Unknown').slice(0, 1024) },
          { name: 'After', value: (newMessage.content || '').slice(0, 1024) },
          { name: 'Jump', value: `[Click here](${newMessage.url})`, inline: true },
        ],
      });
      await ch.send({ embeds: [embed] });
    } catch (_) { /* silent */ }
  },
};
