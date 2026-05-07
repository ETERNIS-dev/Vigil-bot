const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const Guild = require('../../database/models/Guild');
const AutomodConfig = require('../../database/models/AutomodConfig');
const WelcomeMessage = require('../../database/models/WelcomeMessage');
const { getGuild, invalidateAutomodCache } = require('../../utils/helpers');
const { infoEmbed, successEmbed, errorEmbed, COLORS } = require('../../utils/embedBuilder');

module.exports = {
  name: 'setup',
  aliases: [],
  description: 'Interactive setup wizard for Vigil.',
  usage: 'setup',
  permissions: ['Administrator'],
  cooldown: 30,
  async execute(message, args, client) {
    const guildSettings = await getGuild(message.guild.id);
    const results = {};

    async function askStep(stepTitle, stepDesc) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm').setLabel('✅ Confirm').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('skip').setLabel('⏭️ Skip').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger),
      );
      const embed = new EmbedBuilder().setColor(COLORS.INFO).setTitle(`🧙 Setup: ${stepTitle}`).setDescription(stepDesc).setFooter({ text: 'Reply in chat or click a button. Times out in 60s.' });
      const stepMsg = await message.channel.send({ embeds: [embed], components: [row] });

      return new Promise(resolve => {
        const msgCollector = message.channel.createMessageCollector({ filter: m => m.author.id === message.author.id, time: 60000, max: 1 });
        const btnCollector = stepMsg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000, max: 1 });

        function cleanup(result) {
          msgCollector.stop();
          btnCollector.stop();
          stepMsg.edit({ components: [] }).catch(() => {});
          resolve(result);
        }

        msgCollector.on('collect', m => { m.delete().catch(() => {}); cleanup({ type: 'message', value: m.content }); });
        btnCollector.on('collect', i => { i.deferUpdate(); cleanup({ type: 'button', value: i.customId }); });
        msgCollector.on('end', (_, r) => { if (r === 'time') cleanup({ type: 'button', value: 'skip' }); });
      });
    }

    // Step 1: Mod log channel
    const step1 = await askStep('Step 1: Mod Log Channel', 'Mention the channel to use as the mod log (e.g. #mod-log), or click Skip.');
    if (step1.value === 'cancel') return message.channel.send({ embeds: [errorEmbed('Setup cancelled.')] });
    if (step1.type === 'message') {
      const chId = step1.value.replace(/[<#>]/g, '');
      const ch = message.guild.channels.cache.get(chId);
      if (ch) { results.modLogChannel = ch.id; await Guild.updateOne({ guildId: message.guild.id }, { $set: { modLogChannel: ch.id } }, { upsert: true }); }
    }

    // Step 2: Reports channel
    const step2 = await askStep('Step 2: Reports Channel', 'Mention the channel for user reports, or click Skip.');
    if (step2.value === 'cancel') return message.channel.send({ embeds: [errorEmbed('Setup cancelled.')] });
    if (step2.type === 'message') {
      const chId = step2.value.replace(/[<#>]/g, '');
      const ch = message.guild.channels.cache.get(chId);
      if (ch) { results.reportsChannel = ch.id; await Guild.updateOne({ guildId: message.guild.id }, { $set: { reportsChannel: ch.id } }, { upsert: true }); }
    }

    // Step 3: Welcome channel + message
    const step3 = await askStep('Step 3: Welcome Channel', 'Mention a welcome channel, or click Skip.');
    if (step3.value === 'cancel') return message.channel.send({ embeds: [errorEmbed('Setup cancelled.')] });
    if (step3.type === 'message') {
      const chId = step3.value.replace(/[<#>]/g, '');
      const ch = message.guild.channels.cache.get(chId);
      if (ch) {
        const msgStep = await askStep('Step 3b: Welcome Message', 'Type your welcome message (supports {user}, {server}, {memberCount}), or skip.');
        if (msgStep.type === 'message' && msgStep.value !== 'skip') {
          await WelcomeMessage.create({ guildId: message.guild.id, type: 'join', name: 'Default Welcome', channelId: ch.id, embed: { useEmbed: false }, plainMessage: msgStep.value });
          results.welcomeChannel = ch.id;
        }
      }
    }

    // Step 4: Leave channel
    const step4 = await askStep('Step 4: Leave Channel', 'Mention a leave channel, or click Skip.');
    if (step4.value === 'cancel') return message.channel.send({ embeds: [errorEmbed('Setup cancelled.')] });
    if (step4.type === 'message') {
      const chId = step4.value.replace(/[<#>]/g, '');
      const ch = message.guild.channels.cache.get(chId);
      if (ch) {
        await WelcomeMessage.create({ guildId: message.guild.id, type: 'leave', name: 'Default Leave', channelId: ch.id, embed: { useEmbed: false }, plainMessage: '{username} has left the server.' });
        results.leaveChannel = ch.id;
      }
    }

    // Step 5: Autorole
    const step5 = await askStep('Step 5: Auto Role', 'Mention a role to assign to new members, or click Skip.');
    if (step5.value === 'cancel') return message.channel.send({ embeds: [errorEmbed('Setup cancelled.')] });
    if (step5.type === 'message') {
      const roleId = step5.value.replace(/[<@&>]/g, '');
      const role = message.guild.roles.cache.get(roleId);
      if (role) { await Guild.updateOne({ guildId: message.guild.id }, { $addToSet: { autoroles: role.id } }, { upsert: true }); results.autorole = role.id; }
    }

    // Step 6: Anti-spam
    const step6 = await askStep('Step 6: Anti-Spam', 'Enable anti-spam? (Type "yes" or click Skip)');
    if (step6.value === 'cancel') return message.channel.send({ embeds: [errorEmbed('Setup cancelled.')] });
    if (step6.type === 'message' && step6.value.toLowerCase() === 'yes') {
      await AutomodConfig.findOneAndUpdate({ guildId: message.guild.id }, { $set: { 'rules.spam.enabled': true } }, { upsert: true });
      invalidateAutomodCache(message.guild.id);
      results.antispam = true;
    }

    // Step 7: Anti-invite
    const step7 = await askStep('Step 7: Anti-Invite Filter', 'Enable anti-invite filter? (Type "yes" or click Skip)');
    if (step7.value === 'cancel') return message.channel.send({ embeds: [errorEmbed('Setup cancelled.')] });
    if (step7.type === 'message' && step7.value.toLowerCase() === 'yes') {
      await AutomodConfig.findOneAndUpdate({ guildId: message.guild.id }, { $set: { 'rules.invites.enabled': true } }, { upsert: true });
      invalidateAutomodCache(message.guild.id);
      results.antiinvite = true;
    }

    // Step 8: Caps filter
    const step8 = await askStep('Step 8: Caps Filter', 'Enable caps filter? (Type "yes" or click Skip)');
    if (step8.value === 'cancel') return message.channel.send({ embeds: [errorEmbed('Setup cancelled.')] });
    if (step8.type === 'message' && step8.value.toLowerCase() === 'yes') {
      await AutomodConfig.findOneAndUpdate({ guildId: message.guild.id }, { $set: { 'rules.caps.enabled': true } }, { upsert: true });
      invalidateAutomodCache(message.guild.id);
      results.caps = true;
    }

    // Step 9: Complete
    const summaryLines = [
      `**Mod Log:** ${results.modLogChannel ? `<#${results.modLogChannel}>` : 'Not set'}`,
      `**Reports Channel:** ${results.reportsChannel ? `<#${results.reportsChannel}>` : 'Not set'}`,
      `**Welcome Channel:** ${results.welcomeChannel ? `<#${results.welcomeChannel}>` : 'Not set'}`,
      `**Leave Channel:** ${results.leaveChannel ? `<#${results.leaveChannel}>` : 'Not set'}`,
      `**Auto Role:** ${results.autorole ? `<@&${results.autorole}>` : 'Not set'}`,
      `**Anti-Spam:** ${results.antispam ? 'Enabled' : 'Skipped'}`,
      `**Anti-Invite:** ${results.antiinvite ? 'Enabled' : 'Skipped'}`,
      `**Caps Filter:** ${results.caps ? 'Enabled' : 'Skipped'}`,
    ];
    message.channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.SUCCESS).setTitle('✅ Setup Complete!').setDescription(summaryLines.join('\n')).setTimestamp().setFooter({ text: 'Vigil Setup Wizard' })] });
  },
};
