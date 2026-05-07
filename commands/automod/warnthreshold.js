const Guild = require('../../database/models/Guild');
const { getGuild } = require('../../utils/helpers');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'warnthreshold',
  aliases: ['wt'],
  description: 'Configure warn threshold rules.',
  usage: 'warnthreshold [add <count> <days> <punishment> [muteDuration]|remove <count>]',
  permissions: ['ManageGuild'],
  cooldown: 3,
  async execute(message, args, client) {
    const guildSettings = await getGuild(message.guild.id);
    const sub = args[0]?.toLowerCase();
    if (!sub) {
      const thresholds = guildSettings.warnThresholds;
      if (!thresholds?.length) return message.reply({ embeds: [infoEmbed('Warn Thresholds', 'No thresholds configured.\nUse `v!warnthreshold add <count> <days> <punishment> [muteDuration]`')] });
      const desc = thresholds.map(t => `**${t.warnCount} warns** in **${t.timeWindowDays}d** → **${t.punishment}**${t.muteDuration ? ` (${t.muteDuration})` : ''}`).join('\n');
      return message.reply({ embeds: [infoEmbed('Warn Thresholds', desc)] });
    }
    if (sub === 'add') {
      const count = parseInt(args[1]);
      const days = parseInt(args[2]);
      const punishment = args[3]?.toLowerCase();
      const muteDuration = args[4] || null;
      if (isNaN(count) || isNaN(days) || !punishment) return message.reply({ embeds: [errorEmbed('Usage: `warnthreshold add <count> <days> <punishment> [muteDuration]`')] });
      const valid = ['mute', 'kick', 'ban'];
      if (!valid.includes(punishment)) return message.reply({ embeds: [errorEmbed(`Valid punishments: ${valid.join(', ')}`)] });
      guildSettings.warnThresholds = guildSettings.warnThresholds.filter(t => t.warnCount !== count);
      guildSettings.warnThresholds.push({ warnCount: count, timeWindowDays: days, punishment, muteDuration });
      guildSettings.warnThresholds.sort((a, b) => a.warnCount - b.warnCount);
      await guildSettings.save();
      return message.reply({ embeds: [successEmbed(`Added threshold: **${count} warns** in **${days}d** → **${punishment}**${muteDuration ? ` for ${muteDuration}` : ''}.`)] });
    }
    if (sub === 'remove') {
      const count = parseInt(args[1]);
      if (isNaN(count)) return message.reply({ embeds: [errorEmbed('Please provide a warn count to remove.')] });
      guildSettings.warnThresholds = guildSettings.warnThresholds.filter(t => t.warnCount !== count);
      await guildSettings.save();
      return message.reply({ embeds: [successEmbed(`Removed threshold for **${count} warns**.`)] });
    }
    message.reply({ embeds: [errorEmbed('Use `add` or `remove`.')] });
  },
};
