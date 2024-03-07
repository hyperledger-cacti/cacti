import path from "path";
import { fileURLToPath } from "url";
import { simpleGit, SimpleGit, SimpleGitOptions } from "simple-git";
import { compareSemVer, isValidSemVer } from "semver-parser";
import { RuntimeError } from "run-time-error";

const TAG = "[tools/get-latest-sem-ver-git-tag.ts]";

const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
const isRunningDirectlyViaCLI = nodePath === modulePath;

if (isRunningDirectlyViaCLI) {
  const excludedTags = process.argv.slice(2);
  getLatestSemVerGitTagV1({ excludedTags, omitFetch: false });
}

export interface IGetLatestSemVerGitTagV1Request {
  readonly excludedTags: string[];
  readonly omitFetch: boolean;
}

export interface IGetLatestSemVerGitTagV1Response {
  readonly latestSemVerTag: string;
}

export async function getLatestSemVerGitTagV1(
  req: IGetLatestSemVerGitTagV1Request,
): Promise<IGetLatestSemVerGitTagV1Response> {
  const options: Partial<SimpleGitOptions> = {
    baseDir: process.cwd(),
    binary: "git",
    maxConcurrentProcesses: 6,
    trimmed: false,
  };

  // when setting all options in a single object
  const git: SimpleGit = simpleGit(options);

  if (req.omitFetch) {
    console.log(`${TAG} omitted git fetch`);
  } else {
    console.log(`${TAG} running git fetch...`);
    await git.fetch();
  }
  console.log(`${TAG} retrieving git tags...`);
  const { all: allTags } = await git.tags();
  console.log(`${TAG} found ${allTags.length} git tags total.`);

  const excludedTags = new Set(req.excludedTags);
  const filteredTags = allTags.filter((t) => !excludedTags.has(t));
  console.log(`${TAG} ${filteredTags.length} tags remain after exclusions.`);

  const semVerTags = filteredTags.filter((t) => isValidSemVer(t));
  console.log(`${TAG} found ${semVerTags.length} semver tags.`, semVerTags);

  const sorted = semVerTags.sort(compareSemVer);
  console.log(`${TAG} sorted ${semVerTags.length} git tags:`, semVerTags);

  const latestSemVerTag = sorted.pop();
  console.log(`${TAG} latestSemVerTag ${latestSemVerTag}`);

  if (!latestSemVerTag) {
    throw new RuntimeError(`Could not find any semver git tags in the repo.`);
  } else {
    return { latestSemVerTag };
  }
}
