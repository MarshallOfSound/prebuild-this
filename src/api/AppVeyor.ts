import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs-extra';
import * as inquirer from 'inquirer';
import * as ora from 'ora';
import * as path from 'path';

import { asyncOra } from '../util/asyncOra';

export const getValidAppVeyorInstance = async (): Promise<AxiosInstance> => {
  const answers = await inquirer.prompt([{
    name: 'appVeyorToken',
    message: 'Please enter your AppVeyor API token:',
  }]);
  const appVeyorToken: string = answers.appVeyorToken;

  const validatingOra = ora('Validating AppVeyor Token').start();

  const appVeyor = axios.create({
    baseURL: 'https://ci.appveyor.com/api',
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${appVeyorToken}`,
    },
  });

  try {
    await appVeyor.get('/projects');
  } catch (err) {
    validatingOra.text = 'Failed to validate AppVeyor token, please try entering it again';
    validatingOra.fail();
    return getValidAppVeyorInstance();
  }
  validatingOra.succeed();
  return appVeyor;
};

interface AppVeyorProject {
  repositoryType: string;
  repositoryName: string;
}

interface ProjectResponse {
  data: AppVeyorProject[];
}

export const setupAppVeyor = async (github: any, appVeyor: AxiosInstance, repoDetails: { repoName: string, repoOwner: string }) => {
  await asyncOra('Setting up AppVeyor CI', async () => {
    const repositoryName = `${repoDetails.repoOwner}/${repoDetails.repoName}`;
    const response: ProjectResponse = await appVeyor.get('/projects');
    const existing = response.data.some(project => project.repositoryType === 'gitHub' && project.repositoryName === repositoryName);

    if (!existing) {
      await appVeyor.post('/projects', {
        repositoryName,
        repositoryProvider: 'gitHub',
      });
    }

    const { data } = await appVeyor.post('/account/encrypt', {
      plainValue: github.__token,
    });

    const sourceConfig = await fs.readFile(path.resolve(__dirname, '../../tmpl/appveyor.yml'), 'utf8');
    await fs.writeFile(path.resolve(process.cwd(), 'appveyor.yml'), sourceConfig.replace('<env>', data));
  });
};
