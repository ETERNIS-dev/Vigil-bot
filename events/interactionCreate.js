const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const BanAppeal = require('../database/models/BanAppeal');
const { getGuild, createCase } = require('../utils/helpers');

const pendingAppeals = new Map();

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Appeal submit button
    if (interaction.isButton() && interaction.customId.startsWith('vigil_appeal_submit_')) {
      const parts = interaction.customId.split('_');
      const guildId = parts[4];
      const userId = parts[5];
      const caseNumber = parseInt(parts[6]) || null;

      if (interaction.user.id !== userId) {
        return interaction.reply({ content: 'This appeal button is not for you.', ephemeral: true });
      }

      const existing = await BanAppeal.findOne({ guildId, userId, status: 'pending' });
      if (!existing) {
        return interaction.reply({ content: 'No pending appeal found. You may have already submitted one or it expired.', ephemeral: true });
      }
      if (existing.appealReason) {
        return interaction.reply({ content: 'You have already submitted an appeal reason.', ephemeral: true });
      }

      await interaction.reply({ content: 'Please describe why you believe your ban should be lifted. Reply to this DM within 5 minutes.', ephemeral: false });

      const collector = interaction.channel.createMessageCollector({
        filter: m => m.author.id === userId,
        max: 1,
        time: 300000,
      });

      collector.on('collect', async (msg) => {
        try {
          const appealReason = msg.content.slice(0, 1000);
          await BanAppeal.findOneAndUpdate({ guildId, userId, status: 'pending' }, { appealReason });

          const guild = client.guilds.cache.get(guildId);
          const guildSettings = await getGuild(guildId);
          const appealChannelId = guildSettings.appealSettings?.appealChannelId;

          const appealDoc = await BanAppeal.findOne({ guildId, userId, status: 'pending' });
          if (!appealDoc) return;

          const appealEmbed = new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle('📋 NEW BAN APPEAL')
            .addFields(
              { name: 'User', value: `${interaction.user.tag} (${userId})`, inline: true },
              { name: 'Case Number', value: `#${caseNumber || 'N/A'}`, inline: true },
              { name: 'Ban Reason', value: appealDoc.banReason || 'No reason provided.' },
              { name: 'Appeal', value: appealReason },
              { name: 'Submitted', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
            )
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`vigil_appeal_approve_${appealDoc._id}`)
              .setLabel('✅ Approve')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`vigil_appeal_deny_${appealDoc._id}`)
              .setLabel('❌ Deny')
              .setStyle(ButtonStyle.Danger),
          );

          let sentMsg = null;
          if (guild && appealChannelId) {
            const ch = guild.channels.cache.get(appealChannelId);
            if (ch) {
              sentMsg = await ch.send({ embeds: [appealEmbed], components: [row] }).catch(() => null);
            }
          }
          if (!sentMsg && guild) {
            const owner = await guild.fetchOwner().catch(() => null);
            if (owner) sentMsg = await owner.user.send({ embeds: [appealEmbed], components: [row] }).catch(() => null);
          }

          if (sentMsg) {
            await BanAppeal.findByIdAndUpdate(appealDoc._id, { appealChannelMsgId: sentMsg.id });
          }

          await msg.reply('✅ Your appeal has been submitted. You will be notified of the decision.').catch(() => {});
        } catch (_) { /* silent */ }
      });

      collector.on('end', (collected) => {
        if (!collected.size) {
          interaction.followUp({ content: 'Appeal timed out. You did not provide a reason within 5 minutes.' }).catch(() => {});
        }
      });
      return;
    }

    // Approve appeal button
    if (interaction.isButton() && interaction.customId.startsWith('vigil_appeal_approve_')) {
      const appealId = interaction.customId.replace('vigil_appeal_approve_', '');
      if (!interaction.member?.permissions.has('BanMembers')) {
        return interaction.reply({ content: 'You need the Ban Members permission.', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId(`vigil_modal_approve_${appealId}`)
        .setTitle('Approve Appeal')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('note')
              .setLabel('Optional note to send to user')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setMaxLength(500)
          )
        );
      return interaction.showModal(modal);
    }

    // Deny appeal button
    if (interaction.isButton() && interaction.customId.startsWith('vigil_appeal_deny_')) {
      const appealId = interaction.customId.replace('vigil_appeal_deny_', '');
      if (!interaction.member?.permissions.has('BanMembers')) {
        return interaction.reply({ content: 'You need the Ban Members permission.', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId(`vigil_modal_deny_${appealId}`)
        .setTitle('Deny Appeal')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('reason')
              .setLabel('Reason for denial (required)')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(500)
          )
        );
      return interaction.showModal(modal);
    }

    // Approve modal submit
    if (interaction.isModalSubmit() && interaction.customId.startsWith('vigil_modal_approve_')) {
      const appealId = interaction.customId.replace('vigil_modal_approve_', '');
      const note = interaction.fields.getTextInputValue('note') || null;

      try {
        const appeal = await BanAppeal.findById(appealId);
        if (!appeal || appeal.status !== 'pending') {
          return interaction.reply({ content: 'This appeal has already been reviewed.', ephemeral: true });
        }

        await BanAppeal.findByIdAndUpdate(appealId, {
          status: 'approved',
          reviewedBy: interaction.user.id,
          reviewedByTag: interaction.user.tag,
          reviewNote: note,
          reviewedAt: new Date(),
        });

        const guildSettings = await getGuild(appeal.guildId);
        const guild = interaction.guild || client.guilds.cache.get(appeal.guildId);

        if (guildSettings.appealSettings?.approveAction === 'unban' && guild) {
          try {
            await guild.members.unban(appeal.userId, `Ban appeal approved by ${interaction.user.tag}`);
            await createCase(client, {
              guildId: appeal.guildId, type: 'UNBAN',
              userId: appeal.userId, userTag: appeal.userTag,
              moderatorId: interaction.user.id, moderatorTag: interaction.user.tag,
              reason: `Ban appeal approved by ${interaction.user.tag}`,
            });
          } catch (_) { /* silent */ }
        }

        const approveMsg = (guildSettings.appealSettings?.approveMessage || 'Your ban appeal has been approved.')
          .replace(/\{server\}/g, guild?.name || 'the server')
          .replace(/\{note\}/g, note || '')
          .replace(/\{user\}/g, appeal.userTag);
        const user = await client.users.fetch(appeal.userId).catch(() => null);
        if (user) await user.send(approveMsg).catch(() => {});

        const updatedEmbed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle('📋 BAN APPEAL — ✅ APPROVED')
          .addFields(
            { name: 'User', value: `${appeal.userTag} (${appeal.userId})`, inline: true },
            { name: 'Case Number', value: `#${appeal.caseNumber || 'N/A'}`, inline: true },
            { name: 'Status', value: '✅ APPROVED', inline: true },
            { name: 'Reviewed By', value: interaction.user.tag, inline: true },
            { name: 'Note', value: note || 'None', inline: true },
          )
          .setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('vigil_disabled_approve').setLabel('✅ Approved').setStyle(ButtonStyle.Success).setDisabled(true),
          new ButtonBuilder().setCustomId('vigil_disabled_deny').setLabel('❌ Deny').setStyle(ButtonStyle.Danger).setDisabled(true),
        );

        await interaction.update({ embeds: [updatedEmbed], components: [disabledRow] });
      } catch (err) {
        interaction.reply({ content: 'An error occurred processing the approval.', ephemeral: true }).catch(() => {});
      }
      return;
    }

    // Deny modal submit
    if (interaction.isModalSubmit() && interaction.customId.startsWith('vigil_modal_deny_')) {
      const appealId = interaction.customId.replace('vigil_modal_deny_', '');
      const reason = interaction.fields.getTextInputValue('reason');

      try {
        const appeal = await BanAppeal.findById(appealId);
        if (!appeal || appeal.status !== 'pending') {
          return interaction.reply({ content: 'This appeal has already been reviewed.', ephemeral: true });
        }

        await BanAppeal.findByIdAndUpdate(appealId, {
          status: 'denied',
          reviewedBy: interaction.user.id,
          reviewedByTag: interaction.user.tag,
          reviewNote: reason,
          reviewedAt: new Date(),
        });

        const guildSettings = await getGuild(appeal.guildId);
        const guild = interaction.guild || client.guilds.cache.get(appeal.guildId);

        const denyMsg = (guildSettings.appealSettings?.denyMessage || 'Your ban appeal has been denied.\nReason: {note}')
          .replace(/\{server\}/g, guild?.name || 'the server')
          .replace(/\{note\}/g, reason)
          .replace(/\{user\}/g, appeal.userTag);
        const user = await client.users.fetch(appeal.userId).catch(() => null);
        if (user) await user.send(denyMsg).catch(() => {});

        const updatedEmbed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle('📋 BAN APPEAL — ❌ DENIED')
          .addFields(
            { name: 'User', value: `${appeal.userTag} (${appeal.userId})`, inline: true },
            { name: 'Case Number', value: `#${appeal.caseNumber || 'N/A'}`, inline: true },
            { name: 'Status', value: '❌ DENIED', inline: true },
            { name: 'Reviewed By', value: interaction.user.tag, inline: true },
            { name: 'Reason', value: reason },
          )
          .setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('vigil_disabled_approve').setLabel('✅ Approve').setStyle(ButtonStyle.Success).setDisabled(true),
          new ButtonBuilder().setCustomId('vigil_disabled_deny').setLabel('❌ Denied').setStyle(ButtonStyle.Danger).setDisabled(true),
        );

        await interaction.update({ embeds: [updatedEmbed], components: [disabledRow] });
      } catch (err) {
        interaction.reply({ content: 'An error occurred processing the denial.', ephemeral: true }).catch(() => {});
      }
      return;
    }
  },
};
