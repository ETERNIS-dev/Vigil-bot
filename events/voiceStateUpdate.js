const LogConfig = require('../database/models/LogConfig');
const { logEmbed, COLORS } = require('../utils/embedBuilder');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    if (!newState.guild) return;
    try {
      const logConfig = await LogConfig.findOne({ guildId: newState.guild.id });
      if (!logConfig?.channels?.voice) return;
      const ch = newState.guild.channels.cache.get(logConfig.channels.voice);
      if (!ch) return;
      const member = newState.member || oldState.member;
      if (!member) return;

      let title, fields;
      if (!oldState.channelId && newState.channelId) {
        title = 'Joined Voice Channel';
        fields = [{ name: 'User', value: member.user.tag, inline: true }, { name: 'Channel', value: newState.channel.name, inline: true }];
      } else if (oldState.channelId && !newState.channelId) {
        title = 'Left Voice Channel';
        fields = [{ name: 'User', value: member.user.tag, inline: true }, { name: 'Channel', value: oldState.channel.name, inline: true }];
      } else if (oldState.channelId !== newState.channelId) {
        title = 'Moved Voice Channel';
        fields = [{ name: 'User', value: member.user.tag, inline: true }, { name: 'From', value: oldState.channel?.name || 'Unknown', inline: true }, { name: 'To', value: newState.channel?.name || 'Unknown', inline: true }];
      } else if (!oldState.serverMute && newState.serverMute) {
        title = 'Server Muted';
        fields = [{ name: 'User', value: member.user.tag, inline: true }];
      } else if (!oldState.serverDeaf && newState.serverDeaf) {
        title = 'Server Deafened';
        fields = [{ name: 'User', value: member.user.tag, inline: true }];
      } else return;

      const embed = logEmbed({ type: 'VOICE', title, color: COLORS.LOG_VOICE, user: member.user, fields });
      await ch.send({ embeds: [embed] });
    } catch (_) { /* silent */ }
  },
};
