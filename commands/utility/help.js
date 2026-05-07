const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../../utils/embedBuilder');

const CATEGORIES = {
  moderation: { emoji: '🔨', desc: 'ban, unban, kick, warn, mute, unmute, purge, lock, unlock, case, cases, delcase, report' },
  automod: { emoji: '🛡️', desc: 'automod, spam, channelspam, mentions, attachments, emojis, msglines, caps, words, links, invites, warnthreshold' },
  config: { emoji: '⚙️', desc: 'setup, prefix, modlog, log, autorole, immune, reason, welcome, leave, boost, rolemsg, specialchannel' },
  roles: { emoji: '🎭', desc: 'rrole, roleconnect' },
  utility: { emoji: '🔧', desc: 'help, userinfo, serverinfo, botinfo, msghistory' },
};

module.exports = {
  name: 'help',
  aliases: ['h', 'commands'],
  description: 'Show the help menu.',
  usage: 'help [command|category]',
  permissions: [],
  cooldown: 3,
  async execute(message, args, client) {
    const query = args[0]?.toLowerCase();
    if (!query) {
      const pages = Object.entries(CATEGORIES).map(([cat, info]) => {
        return new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setTitle(`${info.emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)} Commands`)
          .setDescription(info.desc.split(', ').map(c => `\`${c}\``).join(', '))
          .setFooter({ text: `Vigil Help | Use v!help <command> for details` })
          .setTimestamp();
      });
      let page = 0;
      function buildRow(p) {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
          new ButtonBuilder().setCustomId('next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(p >= pages.length - 1),
        );
      }
      const msg = await message.reply({ embeds: [pages[0]], components: [buildRow(0)] });
      const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
      collector.on('collect', async i => {
        if (i.customId === 'prev' && page > 0) page--;
        if (i.customId === 'next' && page < pages.length - 1) page++;
        await i.update({ embeds: [pages[page]], components: [buildRow(page)] });
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    // Category lookup
    if (CATEGORIES[query]) {
      const info = CATEGORIES[query];
      const cmds = info.desc.split(', ').map(name => {
        const cmd = client.commands.get(name);
        return cmd ? `\`${name}\` — ${cmd.description}` : `\`${name}\``;
      });
      return message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.INFO).setTitle(`${info.emoji} ${query} Commands`).setDescription(cmds.join('\n')).setTimestamp()] });
    }

    // Command lookup
    const cmd = client.commands.get(query);
    if (!cmd) return message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.ERROR).setDescription(`❌ No command or category found for \`${query}\`.`)] });
    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`Command: ${cmd.name}`)
      .addFields(
        { name: 'Description', value: cmd.description || 'No description.' },
        { name: 'Usage', value: `\`v!${cmd.usage || cmd.name}\``, inline: true },
        { name: 'Aliases', value: cmd.aliases?.length ? cmd.aliases.map(a => `\`${a}\``).join(', ') : 'None', inline: true },
        { name: 'Permissions', value: cmd.permissions?.length ? cmd.permissions.join(', ') : 'None', inline: true },
        { name: 'Cooldown', value: `${cmd.cooldown || 3}s`, inline: true },
      )
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};
