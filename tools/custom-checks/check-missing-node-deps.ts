import path from "path";
import { fileURLToPath } from "url";
import { RuntimeError } from "run-time-error";
import fs from "fs-extra";
import depcheck from "depcheck";
import { getAllPkgDirs } from "./get-all-pkg-dirs";
import { ParseResult, parse } from "@babel/parser";
import { File as BabelFile, ImportDeclaration } from "@babel/types";

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

  const verbose = req.verbose === true;
  if (verbose) {
    console.log(`${TAG} SCRIPT_DIR=${SCRIPT_DIR}`);
    console.log(`${TAG} PROJECT_DIR=${PROJECT_DIR}`);
    console.log("%s Package directories to check: %o", TAG, req.pkgDirsToCheck);
  }

  const depCheckOptions: depcheck.Options = {
    ignoreBinPackage: false, // ignore the packages with bin entry
    skipMissing: false, // skip calculation of missing dependencies
    ignorePatterns: [
      // files matching these patterns will be ignored
      "sandbox",
      "dist",
      "bower_components",
      "node_modules",
      "docs/",
      "src/main/kotlin",
      "src/test/",
      "Dockerfile",
      "*.md",
      "*.json",
      "*.test.ts",
      "*.tsx",
      "*.mts",
      "*.scss",
    ],
    ignoreMatches: [
      // ignore dependencies that matches these globs
      "grunt-*",
      "jest-extended",
      "tape-promise",
      "tape",
      "tap",
      "@ionic-native/*",
    ],
    detectors: [
      depcheck.detector.requireCallExpression,
      depcheck.detector.importDeclaration,
      depcheck.detector.importCallExpression,
    ],
  };

  const tasks = req.pkgDirsToCheck.map(async (pkgDir) => {
    const manifestPath = path.join(pkgDir, "package.json");
    const manifestExists = await fs.pathExists(manifestPath);
    if (!manifestExists) {
      if (verbose) {
        console.log("%s %s has no package.json. Skipping.", TAG, manifestPath);
      }
      return;
    }

    const depCheckResult = await depcheck(pkgDir, depCheckOptions);
    const { missing } = depCheckResult;
    const missingDepNames = Object.keys(missing);

    if (verbose) {
      console.log("%s DepCheck result %s: %o", TAG, pkgDir, depCheckResult);
    }

    const prodCodePathPrefixes = [path.join(pkgDir, "src/main/")];

    const prodDepMissingErrors = await findMissingPrdDeps({
      depCheckResult,
      manifestPath,
      verbose,
      TAG,
      prodCodePathPrefixes,
      ignoredPkgNameRegExps: [new RegExp("@types/.*")],
    });

    prodDepMissingErrors.forEach((e) => errors.push(e));

    missingDepNames.forEach((depName) => {
      const filesUsingDep = missing[depName].join("\n\t");
      const anError = `"${depName}" is a missing dependency from ${manifestPath} with the following files using them:\n\t${filesUsingDep}`;
      errors.push(anError);
      if (req.verbose) {
        console.log(
          "%s Missing dep %s in %s",
          TAG,
          depName,
          manifestPath,
          missing[depName],
        );
      }
    });
  });

  await Promise.all(tasks);

  return [errors.length === 0, errors];
}

async function findMissingPrdDeps(req: {
  readonly depCheckResult: depcheck.Results;
  readonly manifestPath: Readonly<string>;
  readonly TAG: Readonly<string>;
  readonly verbose: boolean;
  readonly prodCodePathPrefixes: Readonly<Array<string>>;
  readonly ignoredPkgNameRegExps: Readonly<Array<RegExp>>;
}): Promise<string[]> {
  const fn =
    "[tools/custom-checks/check-missing-node-deps.ts]#filterUsingToSrcMainDirs()";
  if (!req) {
    throw new Error(fn + "Expected arg req to be truthy");
  }
  if (!req.depCheckResult) {
    throw new Error(fn + "Expected arg req.depCheckResult to be truthy");
  }
  if (!req.depCheckResult.using) {
    throw new Error(fn + "Expected req.depCheckResult.using to be truthy");
  }
  if (!req.manifestPath) {
    throw new Error(fn + "Expected arg req.manifestPath to be truthy");
  }
  if (req.verbose !== true && req.verbose !== false) {
    throw new Error(fn + "Expected arg req.verbose to be strictly bool");
  }
  if (!req.TAG) {
    throw new Error(fn + "Expected arg req.TAG to be truthy");
  }
  if (!req.prodCodePathPrefixes) {
    throw new Error(fn + "Expected arg req.prodCodePathPrefixes to be truthy");
  }
  if (!Array.isArray(req.prodCodePathPrefixes)) {
    throw new Error(fn + "Expected arg req.prodCodePathPrefixes to be Array");
  }
  if (!req.ignoredPkgNameRegExps) {
    throw new Error(fn + "Expected arg req.ignoredPkgNameRegExps to be truthy");
  }
  if (!Array.isArray(req.ignoredPkgNameRegExps)) {
    throw new Error(fn + "Expected arg req.ignoredPkgNameRegExps to be Array");
  }

  const {
    manifestPath,
    depCheckResult,
    TAG,
    verbose,
    prodCodePathPrefixes,
    ignoredPkgNameRegExps,
  } = req;

  const prodDepMissingErrors: string[] = [];

  const pkgPojo = await fs.readJson(req.manifestPath);

  if (!pkgPojo) {
    prodDepMissingErrors.push(`${manifestPath} was parsed into a falsy POJO.`);
  }

  const { dependencies } = pkgPojo;
  if (!dependencies || typeof dependencies !== "object") {
    if (verbose) {
      console.log("%s Skipping %s: no 'dependencies' key", fn, manifestPath);
    }
    return prodDepMissingErrors;
  }
  if (verbose) {
    console.log("%s prod dependencies %s: %o", TAG, manifestPath, dependencies);
  }

  const depEntries = Object.entries(dependencies);
  if (depEntries.length <= 0) {
    if (verbose) {
      console.log("%s Skipping %s: empty 'dependencies'", fn, manifestPath);
    }
    return prodDepMissingErrors;
  }

  const prodDepPkgs = depEntries.map(([k]) => k);

  const { using } = depCheckResult;

  const parserCache = new Map<string, ParseResult<BabelFile>>();

  const seenAndIgnoredExt = new Set<string>();

  const fileToAstMap = new Map<string, Array<ParseResult<BabelFile>>>();

  const parseTasks = Object.entries(using).map(async ([k, v]) => {
    const astsOfK = [];
    for (let i = 0; i < v.length; i++) {
      const filePath = v[i];
      const supportedFileExtensions = [".ts", ".js"];
      const fileExtension = path.extname(filePath);
      if (!supportedFileExtensions.includes(fileExtension)) {
        seenAndIgnoredExt.add(fileExtension);
        continue;
      }
      const contentBuffer = await fs.readFile(filePath);
      const contentStr = contentBuffer.toString("utf-8");

      const cachedAst = parserCache.get(filePath);

      const ast =
        cachedAst ||
        (await parse(contentStr, {
          sourceType: "module",
          sourceFilename: filePath,
          attachComment: false,
          plugins: [
            "typescript",
            "decorators-legacy",
            "dynamicImport",
            "importAttributes",
            "importMeta",
            "importReflection",
            "deferredImportEvaluation",
            "sourcePhaseImports",
          ],
        }));

      parserCache.set(filePath, ast as ParseResult<BabelFile>);

      astsOfK.push(ast);
    }
    fileToAstMap.set(k, astsOfK as Array<ParseResult<BabelFile>>);
  });

  if (seenAndIgnoredExt.size > 0) {
    console.log("%s Seen+Ignored file extensions: %o", fn, seenAndIgnoredExt);
  }

  await Promise.all(parseTasks);

  const missingProdDeps = Object.entries(using).filter(([k, v]) => {
    // Is it being imported by code that is in a directory indicating prod use?
    const pathPrefixMatch = v.some((x) =>
      prodCodePathPrefixes.some((prefix) => x.startsWith(prefix)),
    );
    // Is it actually missing from the package.json#dependencies hash?
    const isMissing = !prodDepPkgs.includes(k);

    // We choose to ignore dependencies like @types/express or @types/* because
    // we know that at runtime the Typescript compiler will delete those imports
    const notIgnored = ignoredPkgNameRegExps.every((r: RegExp) => !r.test(k));

    // If both are true we caught ourselves a missing production dependency that
    // will crash at runtime if not rectified.
    const isMissingProdDep = pathPrefixMatch && isMissing && notIgnored;

    const asts = fileToAstMap.get(k);
    if (!asts) {
      const errorMessage = `${fn} Expected presence of parsed AST in map for dependency=${k}`;
      throw new Error(errorMessage);
    }

    const andNotOnlyTypeImports = asts.some((ast) =>
      ast.program.body
        .filter((n): n is ImportDeclaration => {
          return n.type === "ImportDeclaration";
        })
        .filter((n) => n.source.value === k)
        .some((n) => n.importKind !== "type"),
    );

    return isMissingProdDep && andNotOnlyTypeImports;
  });

  if (!Array.isArray(missingProdDeps)) {
    throw new Error(fn + "Expected missingProdDeps to be Array");
  }

  missingProdDeps.forEach(([k, v]) => {
    const usageLocations = v.join("\n\t");
    const errorMsg = `${TAG} ERROR - MISSING production dependency ${k} from ${manifestPath}. Found usage in \n\t${usageLocations}`;
    prodDepMissingErrors.push(errorMsg);
  });

  return prodDepMissingErrors;
}

const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
const isRunningDirectlyViaCLI = nodePath === modulePath;

if (isRunningDirectlyViaCLI) {
  const { absolutePaths: pkgDirsToCheck } = await getAllPkgDirs();

  const req: ICheckMissingNodeDepsRequest = {
    verbose: false,
    pkgDirsToCheck,
  };
  const [success, errors] = await checkMissingNodeDeps(req);
  if (!success) {
    errors.forEach((x) => console.error(`\n\n${x}`));
    process.exit(1);
  }
}
