import axios, { AxiosInstance } from 'axios';
import * as GitHubApi from 'github';
import * as inquirer from 'inquirer';
import * as ora from 'ora';

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
    },
  });
};
