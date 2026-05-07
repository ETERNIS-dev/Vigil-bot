const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[Vigil] Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: 'v!help | Keeping order', type: ActivityType.Watching }],
      status: 'online',
    });
  },
};
