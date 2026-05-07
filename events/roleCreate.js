const LogConfig = require('../database/models/LogConfig');
const { logEmbed, COLORS } = require('../utils/embedBuilder');

module.exports = {
  name: 'roleCreate',
  async execute(role, client) {
    try {
      const logConfig = await LogConfig.findOne({ guildId: role.guild.id });
      if (!logConfig?.channels?.roles) return;
      const ch = role.guild.channels.cache.get(logConfig.channels.roles);
      if (!ch) return;
      const embed = logEmbed({
        type: 'ROLE_CREATE',
        title: 'Role Created',
        color: COLORS.SUCCESS,
        fields: [
          { name: 'Name', value: role.name, inline: true },
          { name: 'Color', value: role.hexColor, inline: true },
          { name: 'ID', value: role.id, inline: true },
        ],
      });
      await ch.send({ embeds: [embed] });
    } catch (_) { /* silent */ }
  },
};
