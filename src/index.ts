#!/usr/bin/env node

import { AxiosInstance } from 'axios';
import * as inquirer from 'inquirer';

import { getValidAppVeyorInstance } from './api/AppVeyor';
import { getValidGitHubInstance } from './api/GitHub';
import { getValidTravisInstance } from './api/TravisCI';
import { getRepo } from './util/repo';

export const main = async () => {
  const repo = await getRepo();
  const github = await getValidGitHubInstance(repo);
  const answers = await inquirer.prompt([{
    name: 'operatingSystems',
    type: 'checkbox',
    message: 'Which operating systems does this module support?',
    choices: [
      'Windows',
      'macOS',
      'Linux',
    ],
    validate: (systems) => {
      if (systems.length !== 0) return true;
      return 'You need to choose at least one operating system';
    },
  }]);

  const operatingSystems: string[] = answers.operatingSystems;

  let appVeyorInstance: AxiosInstance;
  let travisInstance: AxiosInstance;

  if (operatingSystems.includes('Windows')) {
    appVeyorInstance = await getValidAppVeyorInstance();
  }

  if (operatingSystems.includes('macOS') || operatingSystems.includes('Linux')) {
    travisInstance = await getValidTravisInstance(github);
  }
};

if (process.mainModule === module) {
  process.on('unhandledRejection', (err) => {
    console.error(err);
    process.exit(1);
  });
  main();
}
