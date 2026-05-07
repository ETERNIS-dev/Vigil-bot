const { getAutomod } = require('../../utils/helpers');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'automod',
  aliases: [],
  description: 'View the automod overview for this server.',
  usage: 'automod',
  permissions: ['ManageGuild'],
  cooldown: 5,
  async execute(message, args, client) {
    const config = await getAutomod(message.guild.id);
    const r = config.rules;
    const fmt = (enabled) => enabled ? '✅ Enabled' : '❌ Disabled';
    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle('🛡️ Automod Overview')
      .addFields(
        { name: 'Spam', value: `${fmt(r.spam?.enabled)} | Max: ${r.spam?.maxMessages} in ${r.spam?.timeWindow}s | Punishment: ${r.spam?.punishment}`, inline: false },
        { name: 'Channel Spam', value: `${fmt(r.channelSpam?.enabled)} | Max: ${r.channelSpam?.maxChannels} channels in ${r.channelSpam?.timeWindow}s | Punishment: ${r.channelSpam?.punishment}`, inline: false },
        { name: 'Mentions', value: `${fmt(r.mentions?.enabled)} | Max: ${r.mentions?.maxMentions} in ${r.mentions?.timeWindow}s | Punishment: ${r.mentions?.punishment}`, inline: false },
        { name: 'Attachments', value: `${fmt(r.attachments?.enabled)} | Max: ${r.attachments?.maxAttachments} in ${r.attachments?.timeWindow}s | Punishment: ${r.attachments?.punishment}`, inline: false },
        { name: 'Emojis', value: `${fmt(r.emojis?.enabled)} | Max: ${r.emojis?.maxEmojis} in ${r.emojis?.timeWindow}s | Punishment: ${r.emojis?.punishment}`, inline: false },
        { name: 'Message Lines', value: `${fmt(r.msgLines?.enabled)} | Warn at: ${r.msgLines?.warnAt} | Delete at: ${r.msgLines?.deleteAt} | Punishment: ${r.msgLines?.punishment}`, inline: false },
        { name: 'Caps', value: `${fmt(r.caps?.enabled)} | Min: ${r.caps?.minChars} chars | ${r.caps?.percentage}% caps | Punishment: ${r.caps?.punishment}`, inline: false },
        { name: 'Blocked Words', value: `${fmt(r.words?.enabled)} | Groups: ${r.words?.groups?.length || 0}`, inline: false },
        { name: 'Links', value: `${fmt(r.links?.enabled)} | Whitelist: ${r.links?.whitelist?.length || 0} | Punishment: ${r.links?.punishment}`, inline: false },
        { name: 'Invites', value: `${fmt(r.invites?.enabled)} | Whitelist: ${r.invites?.whitelist?.length || 0} | Punishment: ${r.invites?.punishment}`, inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'Vigil Automod' });
    message.reply({ embeds: [embed] });
  },
};
