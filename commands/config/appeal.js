const { getGuild } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');
const Guild = require('../../database/models/Guild');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'appeal',
  aliases: [],
  description: 'Configure the ban appeal system.',
  usage: 'appeal [on|off|channel|message|approveaction|approvemsg|denymsg]',
  permissions: ['Administrator'],
  cooldown: 3,
  async execute(message, args) {
    const guildSettings = await getGuild(message.guild.id);
    const ap = guildSettings.appealSettings || {};

    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('⚖️ Ban Appeal Settings')
        .addFields(
          { name: 'Status', value: ap.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Appeal Channel', value: ap.appealChannelId ? `<#${ap.appealChannelId}>` : 'Not set', inline: true },
          { name: 'Approve Action', value: ap.approveAction || 'unban', inline: true },
          { name: 'Appeal Message', value: ap.appealMessage || 'Not set' },
          { name: 'Approve Message', value: ap.approveMessage || 'Not set' },
          { name: 'Deny Message', value: ap.denyMessage || 'Not set' },
        );
      return message.reply({ embeds: [embed] });
    }

    const sub = args[0].toLowerCase();
    const value = args.slice(1).join(' ');
    const update = {};

    if (sub === 'on') {
      update['appealSettings.enabled'] = true;
    } else if (sub === 'off') {
      update['appealSettings.enabled'] = false;
    } else if (sub === 'channel') {
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply({ embeds: [errorEmbed('Please mention a channel.')] });
      update['appealSettings.appealChannelId'] = ch.id;
    } else if (sub === 'message') {
      if (!value) return message.reply({ embeds: [errorEmbed('Please provide a message.')] });
      update['appealSettings.appealMessage'] = value;
    } else if (sub === 'approveaction') {
      const action = args[1]?.toLowerCase();
      if (!['unban', 'notify'].includes(action)) return message.reply({ embeds: [errorEmbed('Valid options: `unban`, `notify`')] });
      update['appealSettings.approveAction'] = action;
    } else if (sub === 'approvemsg') {
      if (!value) return message.reply({ embeds: [errorEmbed('Please provide a message.')] });
      update['appealSettings.approveMessage'] = value;
    } else if (sub === 'denymsg') {
      if (!value) return message.reply({ embeds: [errorEmbed('Please provide a message.')] });
      update['appealSettings.denyMessage'] = value;
    } else {
      return message.reply({ embeds: [errorEmbed('Unknown subcommand. Use: on, off, channel, message, approveaction, approvemsg, denymsg')] });
    }

    await Guild.findOneAndUpdate({ guildId: message.guild.id }, { $set: update }, { upsert: true });
    message.reply({ embeds: [successEmbed('Appeal settings updated.')] });
  },
};
