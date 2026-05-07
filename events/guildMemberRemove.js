const { sendWelcomeMessages } = require('../utils/helpers');
const LogConfig = require('../database/models/LogConfig');
const { logEmbed, COLORS } = require('../utils/embedBuilder');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    // Leave messages
    await sendWelcomeMessages(client, member, 'leave');

    // Log
    try {
      const logConfig = await LogConfig.findOne({ guildId: member.guild.id });
      if (logConfig?.channels?.members) {
        const ch = member.guild.channels.cache.get(logConfig.channels.members);
        if (ch) {
          const joined = member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown';
          const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.toString()).join(', ') || 'None';
          const embed = logEmbed({
            type: 'MEMBER_LEAVE',
            title: 'Member Left',
            color: COLORS.LOG_MEMBER,
            user: member.user,
            fields: [
              { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
              { name: 'Joined', value: joined, inline: true },
              { name: 'Roles', value: roles.slice(0, 1024) },
            ],
          });
          await ch.send({ embeds: [embed] });
        }
      }
    } catch (_) { /* silent */ }
  },
};
