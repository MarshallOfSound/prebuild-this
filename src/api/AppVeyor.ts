import axios, { AxiosInstance } from 'axios';
import * as inquirer from 'inquirer';
import * as ora from 'ora';

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
