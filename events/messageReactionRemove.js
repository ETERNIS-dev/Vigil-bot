const ReactionRole = require('../database/models/ReactionRole');

module.exports = {
  name: 'messageReactionRemove',
  async execute(reaction, user, client) {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
      const doc = await ReactionRole.findOne({ messageId: reaction.message.id });
      if (!doc) return;
      const emoji = reaction.emoji.id ? `<${reaction.emoji.animated ? 'a' : ''}:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
      const option = doc.options.find(o => o.emoji === emoji);
      if (!option) return;
      const guild = reaction.message.guild;
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return;
      await member.roles.remove(option.roleId).catch(() => {});
    } catch (_) { /* silent */ }
  },
};
