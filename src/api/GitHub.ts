import * as ora from 'ora';
import * as inquirer from 'inquirer';
import * as GitHubApi from 'github';

interface RepoResult {
  data: Repository[];
}

export interface Repository {
  full_name: string;
}

export interface RepoDetails {
  repoName: string;
  repoOwner: string;
}

type RepoResponse = GitHubApi.Link & RepoResult;


const getAllRepos = async (github: GitHubApi) => {
  const repos: Repository[] = [];

  let resp: RepoResponse = await github.repos.getAll({ per_page: 100 });
  while (github.hasNextPage(resp)) {
    repos.push(...resp.data);
    resp = await github.getNextPage(resp);
  }
  return repos;
};

export const getValidGitHubInstance = async ({ repoName, repoOwner }: RepoDetails): Promise<GitHubApi> => {
  const answers = await inquirer.prompt([{
    name: 'githubToken',
    message: 'Please enter a GitHub Personal Access Token with permissions for "repo":',
  }]);
  const githubToken: string = answers.githubToken;

  const validatingOra = ora('Validating GitHub Token').start();

  const github = new GitHubApi();
  github.authenticate({
    type: 'token',
    token: githubToken,
  });

  let repos: Repository[];
  try {
    repos = await getAllRepos(github);
  } catch (err) {
    validatingOra.text = 'The GitHub token you provided was invalid';
    validatingOra.fail();
    return getValidGitHubInstance({ repoName, repoOwner });
  }

  const targetRepo = repos.find(repo => repo.full_name === `${repoOwner}/${repoName}`);
  if (!targetRepo) {
    validatingOra.text = 'The GitHub token you provided did not have permissions for the current repository';
    validatingOra.fail();
    return getValidGitHubInstance({ repoName, repoOwner });
  } else {
    validatingOra.succeed();
  }
  (<any>github).__token = githubToken;
  return github;
};
