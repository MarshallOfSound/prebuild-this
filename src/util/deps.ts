import { spawnPromise } from 'spawn-rx';
import * as fs from 'fs-extra';
import * as ora from 'ora';
import * as path from 'path';

export const install = async () => {
  const installOra = ora('Installing "prebuild" and "prebuild-install"').start();
  try {
    await spawnPromise('npm', ['install', 'prebuild-install', '--save']);
    await spawnPromise('npm', ['install', 'prebuild', '--save-dev']);

    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts.install = 'prebuild-install || node-gyp rebuild';
    await fs.writeJson(packageJsonPath, packageJson);
  } catch (err) {
    installOra.fail();
    throw err;
  }
  installOra.succeed();
};
