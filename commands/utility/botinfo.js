const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embedBuilder');
const { version: djsVersion } = require('discord.js');
const { version: nodeVersion } = process;

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`;
}

module.exports = {
  name: 'botinfo',
  aliases: ['bi', 'about'],
  description: 'View information about Vigil.',
  usage: 'botinfo',
  permissions: [],
  cooldown: 5,
  async execute(message, args, client) {
    const mem = process.memoryUsage();
    const totalCommands = new Set(client.commands.map(c => c.name)).size;
    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle('Vigil Bot Info')
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Bot Name', value: client.user.tag, inline: true },
        { name: 'Version', value: '1.0.0', inline: true },
        { name: 'Uptime', value: formatUptime(client.uptime), inline: true },
        { name: 'Ping', value: `${client.ws.ping}ms`, inline: true },
        { name: 'Servers', value: String(client.guilds.cache.size), inline: true },
        { name: 'Commands', value: String(totalCommands), inline: true },
        { name: 'Node.js', value: nodeVersion, inline: true },
        { name: 'Discord.js', value: `v${djsVersion}`, inline: true },
        { name: 'Memory', value: `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Vigil' });
    message.reply({ embeds: [embed] });
  },
};
