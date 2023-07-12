import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { globby, Options as GlobbyOptions } from "globby";
import { sortPackageJson } from "sort-package-json";
import lernaCfg from "../lerna.json" assert { type: "json" };

export interface ICheckPackageJsonSort {
  readonly argv: string[];
  readonly env: NodeJS.ProcessEnv;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_DIR = __dirname;
const PROJECT_DIR = path.join(SCRIPT_DIR, "../");
const globbyOpts: GlobbyOptions = {
  cwd: PROJECT_DIR,
  ignore: ["**/node_modules"],
};

export async function sortPackages(): Promise<void> {
  const TAG = "[tools/sort-package-json.ts]";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const SCRIPT_DIR = __dirname;
  const PROJECT_DIR = path.join(SCRIPT_DIR, "../../");
  console.log(`${TAG} SCRIPT_DIR=${SCRIPT_DIR}`);
  console.log(`${TAG} PROJECT_DIR=${PROJECT_DIR}`);

  const includeGlobs = lernaCfg.packages.map((x) => x.concat("/package.json"));

  const pkgJsonPaths = await globby(includeGlobs, globbyOpts);
  for (const pkg of pkgJsonPaths) {
    const json = await fs.readJSON(pkg);
    const sortedJson = await sortPackageJson(json);

    const sortedJsonString = JSON.stringify(sortedJson, null, 2).concat("\n");
    fs.writeFile(pkg, sortedJsonString);
  }
}

sortPackages();
