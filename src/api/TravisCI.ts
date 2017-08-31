import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs-extra';
import * as GitHubApi from 'github';
import * as inquirer from 'inquirer';
import * as ora from 'ora';
import * as path from 'path';

import { asyncOra } from '../util/asyncOra';

export const getValidTravisInstance = async (github: GitHubApi): Promise<AxiosInstance> => {
  const travisOra = ora('Fetching Travis Credentials through GitHub').start();
  let accessToken: string;
  try {
    const response = await axios({
      url: '/auth/github',
      method: 'POST',
      data: { github_token: (<any>github).__token },
      baseURL: 'https://api.travis-ci.org',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/vnd.travis-ci.2+json',
        'User-Agent': 'Travis/1.0',
      },
    });
    accessToken = response.data.access_token;
  } catch (err) {
    console.log(err);
    travisOra.fail();
    console.error('Looks like you need to sign up to Travis CI with your GitHub account still');
    console.error('Go and do that then come back to this step');
    await inquirer.prompt([{
      name: 'ready',
      message: 'Ready?',
      type: 'confirm',
    }]);
    return await getValidTravisInstance(github);
  }
  
  travisOra.succeed();

  return axios.create({
    baseURL: 'https://api.travis-ci.org',
    headers: {
      Authorization: `token ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.travis-ci.2+json',
      'User-Agent': 'Travis/1.0',
      'Travis-API-Version': '3',
    },
  });
};

interface Repository {
  active: boolean;
}

interface RepositoryResponse {
  data: Repository;
}

interface EnvVar {
  id: string;
  name: string;
  value: string;
  public: string;
}

interface EnvVarResponse {
  data: {
    env_vars: EnvVar[];
  };
}

export const setupTravisCI = async (github: any, travis: AxiosInstance, repoDetails: { repoName: string, repoOwner: string }, linux: boolean, mac: boolean) => {
  await asyncOra('Setting up TravisCI', async () => {
    const repositoryName = `${repoDetails.repoOwner}%2F${repoDetails.repoName}`;
    const response: RepositoryResponse = await travis.get(`/repo/${repositoryName}`);

    if (!response.data.active) {
      await travis.post(`/repo/${repositoryName}/activate`);
    }

    const vars: EnvVarResponse = await travis.get(`/repo/${repositoryName}/env_vars`);
    const exists = vars.data.env_vars.some(envVar => envVar.name === 'prebuild_upload');

    if (!exists) {
      await travis.post(`/repo/${repositoryName}/env_vars`, {
        'env_var.name': 'prebuild_upload',
        'env_var.value': github.__token,
        'env_var.public': false,
      });
    }

    let sourceConfig = await fs.readFile(path.resolve(__dirname, '../../tmpl/.travis.yml'), 'utf8');
    if (linux) sourceConfig = sourceConfig.replace('# - linux', '- linux');
    if (mac) sourceConfig = sourceConfig.replace('# - osx', '- osx');
    await fs.writeFile(path.resolve(process.cwd(), '.travis.yml'), sourceConfig);
  });
};
