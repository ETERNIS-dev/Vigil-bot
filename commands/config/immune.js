const ImmuneRole = require('../../database/models/ImmuneRole');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'immune',
  aliases: [],
  description: 'Manage immune roles (bypass automod and moderation).',
  usage: 'immune <add|remove|list> [@role]',
  permissions: ['Administrator'],
  cooldown: 3,
  async execute(message, args, client) {
    const sub = args[0]?.toLowerCase();
    if (sub === 'list') {
      const roles = await ImmuneRole.find({ guildId: message.guild.id });
      const list = roles.map(r => `<@&${r.roleId}>`).join('\n') || 'None';
      return message.reply({ embeds: [infoEmbed('Immune Roles', list)] });
    }
    if (sub === 'add') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply({ embeds: [errorEmbed('Please mention a role.')] });
      await ImmuneRole.findOneAndUpdate({ guildId: message.guild.id, roleId: role.id }, {}, { upsert: true, new: true });
      return message.reply({ embeds: [successEmbed(`${role} is now immune from moderation.`)] });
    }
    if (sub === 'remove') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply({ embeds: [errorEmbed('Please mention a role.')] });
      await ImmuneRole.deleteOne({ guildId: message.guild.id, roleId: role.id });
      return message.reply({ embeds: [successEmbed(`Removed immunity from ${role}.`)] });
    }
    message.reply({ embeds: [errorEmbed('Usage: `immune <add|remove|list>`')] });
  },
};
