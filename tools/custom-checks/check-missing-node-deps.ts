import path from "path";
import { fileURLToPath } from "url";
import { RuntimeError } from "run-time-error";
import fs from "fs-extra";
import depcheck from "depcheck";
import { getAllPkgDirs } from "./get-all-pkg-dirs";

export interface ICheckMissingNodeDepsRequest {
  readonly pkgDirsToCheck: Readonly<Array<string>>;
  readonly verbose?: boolean;
}

export async function checkMissingNodeDeps(
  req: ICheckMissingNodeDepsRequest,
): Promise<[boolean, string[]]> {
  const TAG = "[tools/check-missing-node-deps.ts]";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const SCRIPT_DIR = __dirname;
  const PROJECT_DIR = path.join(SCRIPT_DIR, "../../");

  const errors: string[] = [];

  if (!req) {
    throw new RuntimeError(`req parameter cannot be falsy.`);
  }
  if (!req.pkgDirsToCheck) {
    throw new RuntimeError(`req.pkgDirsToCheck parameter cannot be falsy.`);
  }

  if (req.verbose) {
    console.log(`${TAG} SCRIPT_DIR=${SCRIPT_DIR}`);
    console.log(`${TAG} PROJECT_DIR=${PROJECT_DIR}`);
  }

  const depCheckOptions = {
    ignoreBinPackage: false, // ignore the packages with bin entry
    skipMissing: false, // skip calculation of missing dependencies
    ignorePatterns: [
      // files matching these patterns will be ignored
      "sandbox",
      "dist",
      "bower_components",
      "node_modules"
    ],
    ignoreMatches: [
      // ignore dependencies that matches these globs
      "grunt-*",
      "jest-extended",
      "tape-promise",
      "tape",
      "tap",
      "@ionic-native/*"
    ],
    // parsers: {
    //   // the target parsers
    //   '**/*.js': depcheck.parser.es6,
    //   '**/*.jsx': depcheck.parser.jsx,
    // },
    detectors: [
      // the target detectors
      depcheck.detector.requireCallExpression,
      depcheck.detector.importDeclaration,
      depcheck.detector.importCallExpression,
    ],
    specials: [
      // the target special parsers
      //   depcheck.special.eslint,
      //   depcheck.special.webpack,
    ],
  };

  const tasks = req.pkgDirsToCheck.map(async (pkgDir) => {
    const manifest = path.join(pkgDir, "package.json");
    const manifestExists = await fs.pathExists(manifest);
    if (!manifestExists) {
      if (req.verbose) {
        console.log("%s %s has no package.json. Skipping.", TAG, manifest);
      }
      return;
    }
    const { missing } = await depcheck(pkgDir, depCheckOptions);
    const missingDepNames = Object.keys(missing);

    missingDepNames.forEach((depName) => {
      const filesUsingDep = missing[depName].join("\n\t");
      const anError = `"${depName}" is a missing dependency from ${manifest} with the following files using them:\n\t${filesUsingDep}`;
      errors.push(anError);
      if (req.verbose) {
        console.log(
          "%s Missing dep %s in %s",
          TAG,
          depName,
          manifest,
          missing[depName],
        );
      }
    });
  });

  await Promise.all(tasks);

  return [errors.length === 0, errors];
}

const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
const isRunningDirectlyViaCLI = nodePath === modulePath;

if (isRunningDirectlyViaCLI) {
  const { absolutePaths: pkgDirsToCheck } = await getAllPkgDirs();

  const req: ICheckMissingNodeDepsRequest = {
    pkgDirsToCheck,
  };
  const [success, errors] = await checkMissingNodeDeps(req);
  if (!success) {
    errors.forEach((x) => console.error(`\n\n${x}`));
    process.exit(1);
  }
}
