const { EmbedBuilder } = require('discord.js');

const COLORS = {
  BAN: 0xe74c3c,
  KICK: 0xe67e22,
  MUTE: 0xf39c12,
  WARN: 0xf1c40f,
  UNBAN: 0x2ecc71,
  UNMUTE: 0x2ecc71,
  INFO: 0x3498db,
  ERROR: 0xe74c3c,
  SUCCESS: 0x2ecc71,
  LOG_MSG: 0x3498db,
  LOG_MEMBER: 0x9b59b6,
  LOG_VOICE: 0x1abc9c,
};

function modEmbed({ type, user, moderator, reason, duration, caseNumber }) {
  const color = COLORS[type] || COLORS.INFO;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${type} | Case #${caseNumber}`)
    .setThumbnail(user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : null)
    .addFields(
      { name: 'User', value: `${user.tag || user} (${user.id || user})`, inline: true },
      { name: 'Moderator', value: `${moderator.tag || moderator} (${moderator.id || moderator})`, inline: true },
      { name: 'Reason', value: reason || 'No reason provided.' },
    )
    .setTimestamp()
    .setFooter({ text: 'Vigil Moderation' });
  if (duration) embed.addFields({ name: 'Duration', value: duration, inline: true });
  return embed;
}

function logEmbed({ type, title, fields = [], user, color }) {
  const embed = new EmbedBuilder()
    .setColor(color || COLORS.INFO)
    .setTitle(title)
    .setTimestamp()
    .setFooter({ text: 'Vigil Logs' });
  if (user && user.displayAvatarURL) {
    embed.setThumbnail(user.displayAvatarURL({ dynamic: true }));
  }
  if (fields.length) embed.addFields(fields);
  return embed;
}

function errorEmbed(description) {
  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setDescription(`❌ ${description}`)
    .setTimestamp();
}

function successEmbed(description) {
  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setDescription(`✅ ${description}`)
    .setTimestamp();
}

function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(title)
    .setDescription(description || '\u200b')
    .setTimestamp();
}

module.exports = { COLORS, modEmbed, logEmbed, errorEmbed, successEmbed, infoEmbed };
