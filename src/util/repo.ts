import * as fs from 'fs-extra';
import * as inquirer from 'inquirer';
import * as path from 'path';
import * as pify from 'pify';

const simpleGit = require('simple-git')(process.cwd());

interface GitRemote {
  name: string;
  refs: {
    [name: string]: string;
  };
}

export const getRepo = async () => {
  if (!await fs.pathExists(path.resolve(process.cwd(), '.git'))) {
    throw 'You aren\'t in the root of a git repository';
  }

  if (!await fs.pathExists(path.resolve(process.cwd(), 'package.json'))) {
    throw 'You aren\'t in the root of a npm package';
  }

  const alLRemotes: GitRemote[] = pify(simpleGit.getRemotes)(true);

  const remotes = alLRemotes.filter(remote => !!remote.name);

  if (remotes.length === 0) {
    throw 'This git repository has no remotes';
  }

  let remote = remotes[0];

  if (remotes.length > 1) {
    const answers = await inquirer.prompt([{
      name: 'remoteName',
      message: 'Please choose the primary remote:',
      choices: remotes.map(remote => remote.name),
    }]);
    const remoteName: string = answers.remoteName;
    remote = remotes.find(remote => remote.name === remoteName) as GitRemote;
  }
  
  const url = remote.refs.fetch;
  if (!url || url.indexOf('github.com') === -1) {
    throw `Expected the selected remote to be a github repository: ${url}`;
  }

  // Either
  // SSH: git@github.com:MarshallOfSound/node-lowlevel-keyboard-hook-win.git
  // HTTPS: https://github.com/MarshallOfSound/node-lowlevel-keyboard-hook-win.git
  const repoIdent = /(?:(?:github\.com\/)|(?::))([^\/]+)\/([^\/]+)\.git/.exec(url);

  if (!repoIdent) {
    throw `Expected the selected remote to be a github repository: ${url}`;
  }

  const repoOwner = repoIdent[1];
  const repoName = repoIdent[2];

  return { repoName, repoOwner };
};
