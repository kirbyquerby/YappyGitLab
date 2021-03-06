const Command = require('../Command');
const ChannelConfig = require('../../Models/ChannelConfig');
const Gitlab = require('../../Gitlab');
const GitlabUrlParser = require('../../Gitlab/GitlabRepoParser');

class GitlabInitCommand extends Command {
  constructor(bot) {
    super(bot);

    this.props.help = {
      name: 'init',
      summary: 'Initialize repo events on the channel.',
      description: 'Initialize repo events on the channel.\nInsert "private" as 2nd argument if the repo is private',
      usage: 'init <repo> [private]',
      examples: [
        'init datitisev/OhPlease-Yappy',
        'init https://gitlab.com/datitisev/DiscordBot-Yappy',
        'init Private/Repo private',
      ],
    };

    this.setConf({
      permLevel: 1,
      aliases: ['initialize'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let channelid = msg.channel.id;
    let repo = args[0];
    let isPrivate = args[1] && (args[1].toLowerCase() === 'private');

    let repository = GitlabUrlParser.Parse(repo) || {};

    let repoName = repository.name;
    let repoUser = repository.owner;
    if (!repository || !repoName || !repoUser) return this.errorUsage(msg);
    let repoFullName = repository.repo && repository.repo.toLowerCase();

    const workingMsg = await msg.channel.send({
      embed: {
        color: 0xFB9738,
        title: `\`${repo}\`: ⚙ Working...`,
      },
    });

    if (isPrivate) {
      // GitlabCache.add(repository.repo);
      let conf = ChannelConfig.FindByChannel(channelid);
      let doc = conf && conf.repos ? conf.repos.includes(repoFullName) : false;
      if (doc) return this.commandError(msg, `Repository \`${repository.repo}\` is already initialized in this channel`);
      return ChannelConfig.AddRepoToChannel(channelid, repoFullName)
      .then(() => {
        let embed = this._successMessage(repository.repo);
        return workingMsg.edit({ embed });
      });
    }

    return Gitlab.getRepo(repoUser, repoName).then(res => {
      const repoInfo = res.body;
      const repoActualName = repoInfo.path_with_namespace;
      const conf = ChannelConfig.FindByChannel(channelid);
      const doc = conf && conf.repos ? conf.repos.includes(repoActualName) : false;
      if (doc) return this.commandError(msg, `Repository \`${repoActualName}\` is already initialized in this channel`);
      return ChannelConfig.AddRepoToChannel(channelid, repoFullName)
      .then(() => {
        let embed = this._successMessage(repoActualName);
        return workingMsg.edit({ embed });
      });
    }).catch(err => {
      let errorMessage = err && err.name ? err.name : err || null;
      if (errorMessage && errorMessage !== 'Gitlab404Error') return this.commandError(msg, `Unable to get repository info for \`${repo}\`\n${err}`);
      return this.commandError(msg, `Unable to initialize! The repository \`${repository.repo}\` doesn't exist or is private!`);
    });
  }
  _successMessage(repo) {
    return {
      color: 0x84F139,
      footer: {
        text: this.bot.user.username,
      },
      title: `\`${repo}\`: Successfully initialized repository events`,
      description: [
        'The repository must a webhook pointing to <https://www.yappybots.tk/gitlab>',
        'To use embeds to have a nicer GitLab log, say `GL! conf set embed true` in this channel to enable embeds for the current channel.',
      ].join('\n'),
    };
  }
}

module.exports = GitlabInitCommand;
