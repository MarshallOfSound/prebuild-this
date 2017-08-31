import * as ora from 'ora';

export const asyncOra = async (text: string, fn: () => Promise<void>) => {
  const spin = ora(text).start();
  try {
    await fn();
  } catch (err) {
    spin.fail();
    throw err;
  }
  spin.succeed();
};
