const LogConfig = require('../database/models/LogConfig');
const { logEmbed, COLORS } = require('../utils/embedBuilder');

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    if (!channel.guild) return;
    try {
      const logConfig = await LogConfig.findOne({ guildId: channel.guild.id });
      if (!logConfig?.channels?.channels) return;
      const ch = channel.guild.channels.cache.get(logConfig.channels.channels);
      if (!ch) return;
      const embed = logEmbed({
        type: 'CHANNEL_DELETE',
        title: 'Channel Deleted',
        color: COLORS.ERROR,
        fields: [
          { name: 'Name', value: channel.name, inline: true },
          { name: 'Type', value: String(channel.type), inline: true },
          { name: 'ID', value: channel.id, inline: true },
        ],
      });
      await ch.send({ embeds: [embed] });
    } catch (_) { /* silent */ }
  },
};
