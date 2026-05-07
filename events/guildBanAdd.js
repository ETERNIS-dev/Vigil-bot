const LogConfig = require('../database/models/LogConfig');
const { logEmbed, COLORS } = require('../utils/embedBuilder');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    try {
      const logConfig = await LogConfig.findOne({ guildId: ban.guild.id });
      if (!logConfig?.channels?.moderation) return;
      const ch = ban.guild.channels.cache.get(logConfig.channels.moderation);
      if (!ch) return;
      const embed = logEmbed({
        type: 'BAN',
        title: 'Member Banned',
        color: COLORS.BAN,
        user: ban.user,
        fields: [
          { name: 'User', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
          { name: 'Reason', value: ban.reason || 'No reason provided.' },
        ],
      });
      await ch.send({ embeds: [embed] });
    } catch (_) { /* silent */ }
  },
};
