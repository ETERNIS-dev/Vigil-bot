const Guild = require('../../database/models/Guild');
const { getGuild } = require('../../utils/helpers');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'autorole',
  aliases: [],
  description: 'Configure auto-roles assigned when a member joins.',
  usage: 'autorole <add|remove|list|delay> [@role|seconds]',
  permissions: ['ManageGuild'],
  cooldown: 3,
  async execute(message, args, client) {
    const sub = args[0]?.toLowerCase();
    const guildSettings = await getGuild(message.guild.id);
    if (sub === 'list') {
      const roles = guildSettings.autoroles.map(id => `<@&${id}>`).join('\n') || 'None';
      return message.reply({ embeds: [infoEmbed('Auto Roles', `**Roles:** ${roles}\n**Delay:** ${guildSettings.autoroleDelay}s`)] });
    }
    if (sub === 'add') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply({ embeds: [errorEmbed('Please mention a role.')] });
      if (!guildSettings.autoroles.includes(role.id)) {
        guildSettings.autoroles.push(role.id);
        await guildSettings.save();
      }
      return message.reply({ embeds: [successEmbed(`Added ${role} to auto-roles.`)] });
    }
    if (sub === 'remove') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply({ embeds: [errorEmbed('Please mention a role.')] });
      guildSettings.autoroles = guildSettings.autoroles.filter(id => id !== role.id);
      await guildSettings.save();
      return message.reply({ embeds: [successEmbed(`Removed ${role} from auto-roles.`)] });
    }
    if (sub === 'delay') {
      const seconds = parseInt(args[1]);
      if (isNaN(seconds) || seconds < 0) return message.reply({ embeds: [errorEmbed('Please provide a valid number of seconds (0 to disable).')] });
      guildSettings.autoroleDelay = seconds;
      await guildSettings.save();
      return message.reply({ embeds: [successEmbed(`Auto-role delay set to **${seconds}** seconds.`)] });
    }
    message.reply({ embeds: [errorEmbed('Usage: `autorole <add|remove|list|delay>`')] });
  },
};
