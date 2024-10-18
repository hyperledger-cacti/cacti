import path from "path";
import { fileURLToPath } from "url";
import { globby, Options as GlobbyOptions } from "globby";
import lernaCfg from "../../lerna.json" assert { type: "json" };

/**
 * Interface for the response of the getAllTgzPath function.
 * @property {Array<string>} relativePaths - An array of relative paths to the
 * package directories.
 */

export interface IGetAllTgzPathResponse {
  readonly relativePaths: Readonly<Array<string>>;
}

/**
 * Asynchronous function to get all tgz filepaths in a Lerna monorepo.
 * @returns {Promise<IGetAllTgzPathResponse>} A promise that resolves to an
 * object containing the arrays of relative paths to the all tgz files.
 */

export async function getAllTgzPath(): Promise<IGetAllTgzPathResponse> {
  const TAG = "[tools/get-all-tgz-path.ts]";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const SCRIPT_DIR = __dirname;
  const PROJECT_DIR = path.join(SCRIPT_DIR, "../../");

  console.log(`${TAG} SCRIPT_DIR=${SCRIPT_DIR}`);
  console.log(`${TAG} PROJECT_DIR=${PROJECT_DIR}`);

  const globbyOpts: GlobbyOptions = {
    cwd: PROJECT_DIR,
    onlyFiles: true,
    expandDirectories: false,
    ignore: ["**/node_modules"],
  };

  const tgzFilesPattern = lernaCfg.packages.map(
    (pkg: string) => `${pkg}/**/hyperledger-*.tgz`,
  );

  const tgzFilesRelative = await globby(tgzFilesPattern, globbyOpts);
  console.log("%s found %s tgz files.", TAG, tgzFilesRelative.length);

  return {
    relativePaths: tgzFilesRelative,
  };
}
