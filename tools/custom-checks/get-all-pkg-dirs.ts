import path from "path";
import { fileURLToPath } from "url";
import { globby, Options as GlobbyOptions } from "globby";
import lernaCfg from "../../lerna.json" assert { type: "json" };

/**
 * Interface for the response of the getAllPkgDirs function.
 * @property {string} gitRootDir - The root directory of the git project.
 * @property {Array<string>} relativePaths - An array of relative paths to the
 * package directories.
 * @property {Array<string>} absolutePaths - An array of absolute paths to the
 * package directories.
 */
export interface IGetAllPkgDirsResponse {
  readonly gitRootDir: string;
  readonly relativePaths: Readonly<Array<string>>;
  readonly absolutePaths: Readonly<Array<string>>;
}

/**
 * Asynchronous function to get all package directories in a Lerna monorepo.
 * @returns {Promise<IGetAllPkgDirsResponse>} A promise that resolves to an
 * object containing the root directory of the git project, and arrays of
 * relative and absolute paths to the package directories.
 */
export async function getAllPkgDirs(): Promise<IGetAllPkgDirsResponse> {
  const TAG = "[tools/get-all-pkg-dirs.ts]";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const SCRIPT_DIR = __dirname;
  const PROJECT_DIR = path.join(SCRIPT_DIR, "../../");
  console.log(`${TAG} SCRIPT_DIR=${SCRIPT_DIR}`);
  console.log(`${TAG} PROJECT_DIR=${PROJECT_DIR}`);

  const globbyOpts: GlobbyOptions = {
    cwd: PROJECT_DIR,
    onlyDirectories: true,
    expandDirectories: false,
    ignore: ["**/node_modules"],
  };

  const pkgDirsRelative = await globby(lernaCfg.packages, globbyOpts);
  console.log("%s found %s package directories.", TAG, pkgDirsRelative.length);

  const pkgDirsAbsolute = pkgDirsRelative.map((x) => path.join(PROJECT_DIR, x));

  return {
    gitRootDir: PROJECT_DIR,
    absolutePaths: pkgDirsAbsolute,
    relativePaths: pkgDirsRelative,
  };
}
