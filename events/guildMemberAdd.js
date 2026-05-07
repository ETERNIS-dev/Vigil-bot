const { getGuild, sendWelcomeMessages } = require('../utils/helpers');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    // Auto-role
    try {
      const guildSettings = await getGuild(member.guild.id);
      if (guildSettings.autoroles?.length) {
        const delay = (guildSettings.autoroleDelay || 0) * 1000;
        setTimeout(async () => {
          for (const roleId of guildSettings.autoroles) {
            try {
              await member.roles.add(roleId);
            } catch (_) { /* role may no longer exist */ }
          }
        }, delay);
      }
    } catch (_) { /* silent */ }

    // Welcome messages
    await sendWelcomeMessages(client, member, 'join');
  },
};
