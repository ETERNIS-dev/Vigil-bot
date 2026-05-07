const LogConfig = require('../database/models/LogConfig');
const { logEmbed, COLORS } = require('../utils/embedBuilder');

module.exports = {
  name: 'channelUpdate',
  async execute(oldChannel, newChannel, client) {
    if (!newChannel.guild) return;
    try {
      const logConfig = await LogConfig.findOne({ guildId: newChannel.guild.id });
      if (!logConfig?.channels?.channels) return;
      const ch = newChannel.guild.channels.cache.get(logConfig.channels.channels);
      if (!ch) return;
      const fields = [{ name: 'Channel', value: newChannel.toString(), inline: true }];
      if (oldChannel.name !== newChannel.name) fields.push({ name: 'Name', value: `${oldChannel.name} → ${newChannel.name}`, inline: true });
      if (oldChannel.topic !== newChannel.topic) fields.push({ name: 'Topic', value: `${oldChannel.topic || 'None'} → ${newChannel.topic || 'None'}` });
      if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) fields.push({ name: 'Slowmode', value: `${oldChannel.rateLimitPerUser}s → ${newChannel.rateLimitPerUser}s`, inline: true });
      if (fields.length <= 1) return;
      const embed = logEmbed({ type: 'CHANNEL_UPDATE', title: 'Channel Updated', color: COLORS.INFO, fields });
      await ch.send({ embeds: [embed] });
    } catch (_) { /* silent */ }
  },
};
