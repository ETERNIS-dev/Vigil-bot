const RoleConnection = require('../../database/models/RoleConnection');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'roleconnect',
  aliases: [],
  description: 'Manage automatic role connections.',
  usage: 'roleconnect <add|remove|list> [@targetRole] [@conditionRole] [add|remove]',
  permissions: ['ManageRoles'],
  cooldown: 3,
  async execute(message, args, client) {
    const sub = args[0]?.toLowerCase();
    if (sub === 'list') {
      const docs = await RoleConnection.find({ guildId: message.guild.id });
      if (!docs.length) return message.reply({ embeds: [infoEmbed('Role Connections', 'None configured.')] });
      const list = docs.map(d => `When <@&${d.conditionRoleId}> is **${d.action === 'add' ? 'gained' : 'lost'}** → **${d.action}** <@&${d.targetRoleId}>`).join('\n');
      return message.reply({ embeds: [infoEmbed('Role Connections', list)] });
    }
    if (sub === 'add') {
      const [targetRole, conditionRole] = message.mentions.roles.map(r => r);
      const action = args[3]?.toLowerCase();
      if (!targetRole || !conditionRole || !['add', 'remove'].includes(action)) {
        return message.reply({ embeds: [errorEmbed('Usage: `roleconnect add @targetRole @conditionRole <add|remove>`')] });
      }
      await RoleConnection.findOneAndUpdate(
        { guildId: message.guild.id, targetRoleId: targetRole.id, conditionRoleId: conditionRole.id },
        { $set: { action } },
        { upsert: true, new: true },
      );
      return message.reply({ embeds: [successEmbed(`When ${conditionRole} is ${action === 'add' ? 'gained' : 'lost'} → ${action} ${targetRole}.`)] });
    }
    if (sub === 'remove') {
      const targetRole = message.mentions.roles.first();
      if (!targetRole) return message.reply({ embeds: [errorEmbed('Mention a target role to remove.')] });
      await RoleConnection.deleteMany({ guildId: message.guild.id, targetRoleId: targetRole.id });
      return message.reply({ embeds: [successEmbed(`Removed role connections for ${targetRole}.`)] });
    }
    message.reply({ embeds: [errorEmbed('Usage: `roleconnect <add|remove|list>`')] });
  },
};
