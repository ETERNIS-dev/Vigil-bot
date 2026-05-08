const { getGuild } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');
const Guild = require('../../database/models/Guild');
const { EmbedBuilder } = require('discord.js');

const TYPES = ['warn', 'mute', 'kick', 'ban', 'unban'];

const DEFAULTS = {
  warn:  { color: '#f1c40f', title: '⚠️ You have been warned',   description: 'You have been warned in **{server}**.' },
  mute:  { color: '#f39c12', title: '🔇 You have been muted',    description: 'You have been muted in **{server}**.' },
  kick:  { color: '#e67e22', title: '👢 You have been kicked',   description: 'You have been kicked from **{server}**.' },
  ban:   { color: '#e74c3c', title: '🔨 You have been banned',   description: 'You have been banned from **{server}**.' },
  unban: { color: '#2ecc71', title: '✅ You have been unbanned', description: 'Your ban in **{server}** has been lifted.' },
};

module.exports = {
  name: 'punishment',
  aliases: ['punishmsg'],
  description: 'Configure custom punishment DM messages.',
  usage: 'punishment [type] [subcommand] [value]',
  permissions: ['Administrator'],
  cooldown: 3,
  async execute(message, args) {
    const guildSettings = await getGuild(message.guild.id);

    if (!args[0] || args[0] === 'list') {
      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('⚙️ Punishment Messages')
        .setDescription('Configure custom DM messages for each moderation action.');
      for (const type of TYPES) {
        const cfg = guildSettings.punishmentMessages?.[type];
        const enabled = cfg?.enabled !== false;
        embed.addFields({ name: `${enabled ? '✅' : '❌'} ${type.toUpperCase()}`, value: cfg?.embed?.title || DEFAULTS[type].title, inline: true });
      }
      embed.addFields({ name: '\u200b', value: 'Use `v!punishment <type> <subcommand> <value>`\nSubcommands: `message`, `title`, `color`, `footer`, `toggle`, `showreason`, `showmoderator`, `showduration`, `showexpiry`, `reset`' });
      return message.reply({ embeds: [embed] });
    }

    const type = args[0].toLowerCase();
    if (!TYPES.includes(type)) return message.reply({ embeds: [errorEmbed(`Invalid type. Use: ${TYPES.join(', ')}`) ]});

    const sub = args[1]?.toLowerCase();
    if (!sub) {
      const cfg = guildSettings.punishmentMessages?.[type];
      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle(`Punishment Message — ${type.toUpperCase()}`)
        .addFields(
          { name: 'Enabled', value: String(cfg?.enabled !== false), inline: true },
          { name: 'Title', value: cfg?.embed?.title || DEFAULTS[type].title, inline: true },
          { name: 'Color', value: cfg?.embed?.color || DEFAULTS[type].color, inline: true },
          { name: 'Description', value: cfg?.embed?.description || DEFAULTS[type].description },
          { name: 'Footer', value: cfg?.embed?.footer || 'None', inline: true },
          { name: 'Show Reason', value: String(cfg?.embed?.showReason !== false), inline: true },
          { name: 'Show Moderator', value: String(cfg?.embed?.showModerator === true), inline: true },
        );
      return message.reply({ embeds: [embed] });
    }

    const value = args.slice(2).join(' ');
    const update = {};

    if (sub === 'toggle') {
      const current = guildSettings.punishmentMessages?.[type]?.enabled !== false;
      update[`punishmentMessages.${type}.enabled`] = !current;
      await Guild.findOneAndUpdate({ guildId: message.guild.id }, { $set: update }, { upsert: true });
      return message.reply({ embeds: [successEmbed(`${type.toUpperCase()} DMs are now **${!current ? 'enabled' : 'disabled'}**.`)] });
    }
    if (sub === 'message') {
      if (!value) return message.reply({ embeds: [errorEmbed('Please provide a message text.')] });
      update[`punishmentMessages.${type}.embed.description`] = value;
    } else if (sub === 'title') {
      if (!value) return message.reply({ embeds: [errorEmbed('Please provide a title.')] });
      update[`punishmentMessages.${type}.embed.title`] = value;
    } else if (sub === 'color') {
      if (!value || !/^#[0-9a-fA-F]{6}$/.test(value)) return message.reply({ embeds: [errorEmbed('Please provide a valid hex color (e.g. #ff0000).')] });
      update[`punishmentMessages.${type}.embed.color`] = value;
    } else if (sub === 'footer') {
      update[`punishmentMessages.${type}.embed.footer`] = value;
    } else if (sub === 'showreason') {
      update[`punishmentMessages.${type}.embed.showReason`] = value !== 'off';
    } else if (sub === 'showmoderator') {
      update[`punishmentMessages.${type}.embed.showModerator`] = value !== 'off';
    } else if (sub === 'showduration') {
      update[`punishmentMessages.${type}.embed.showDuration`] = value !== 'off';
    } else if (sub === 'showexpiry') {
      update[`punishmentMessages.${type}.embed.showExpiry`] = value !== 'off';
    } else if (sub === 'reset') {
      update[`punishmentMessages.${type}`] = {
        enabled: true,
        embed: { ...DEFAULTS[type], useEmbed: true, showReason: true, showModerator: false, showServer: true, showTimestamp: true },
      };
      await Guild.findOneAndUpdate({ guildId: message.guild.id }, { $set: update }, { upsert: true });
      return message.reply({ embeds: [successEmbed(`Reset ${type.toUpperCase()} punishment message to defaults.`)] });
    } else {
      return message.reply({ embeds: [errorEmbed('Unknown subcommand. Use: message, title, color, footer, toggle, showreason, showmoderator, showduration, showexpiry, reset')] });
    }

    await Guild.findOneAndUpdate({ guildId: message.guild.id }, { $set: update }, { upsert: true });
    message.reply({ embeds: [successEmbed(`Updated ${type.toUpperCase()} punishment message.`)] });
  },
};
