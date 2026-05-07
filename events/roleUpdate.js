const LogConfig = require('../database/models/LogConfig');
const { logEmbed, COLORS } = require('../utils/embedBuilder');

module.exports = {
  name: 'roleUpdate',
  async execute(oldRole, newRole, client) {
    try {
      const logConfig = await LogConfig.findOne({ guildId: newRole.guild.id });
      if (!logConfig?.channels?.roles) return;
      const ch = newRole.guild.channels.cache.get(logConfig.channels.roles);
      if (!ch) return;
      const fields = [{ name: 'Role', value: newRole.toString(), inline: true }];
      if (oldRole.name !== newRole.name) fields.push({ name: 'Name', value: `${oldRole.name} → ${newRole.name}`, inline: true });
      if (oldRole.hexColor !== newRole.hexColor) fields.push({ name: 'Color', value: `${oldRole.hexColor} → ${newRole.hexColor}`, inline: true });
      if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) fields.push({ name: 'Permissions Changed', value: 'Yes', inline: true });
      if (fields.length <= 1) return;
      const embed = logEmbed({ type: 'ROLE_UPDATE', title: 'Role Updated', color: COLORS.INFO, fields });
      await ch.send({ embeds: [embed] });
    } catch (_) { /* silent */ }
  },
};
