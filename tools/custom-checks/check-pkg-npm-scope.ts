import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { globby, Options as GlobbyOptions } from "globby";
import { RuntimeError } from "run-time-error";
import { hasKey } from "../has-key";
// eslint-disable-next-line prettier/prettier
import lernaCfg from "../../lerna.json" assert { type: "json" };

export async function checkPkgNpmScope(req: {
  readonly argv: string[];
  readonly env: NodeJS.ProcessEnv;
  readonly scope: string;
  readonly allowedPrefixes: string[];
  readonly preferredPrefix: string;
  readonly autoFixErrors: boolean;
  readonly excludePatterns: string[];
}): Promise<[boolean, string[]]> {
  const TAG = "[tools/check-pkg-npm-scope.ts]";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const SCRIPT_DIR = __dirname;
  const PROJECT_DIR = path.join(SCRIPT_DIR, "../../");
  console.log(`${TAG} SCRIPT_DIR=${SCRIPT_DIR}`);
  console.log(`${TAG} PROJECT_DIR=${PROJECT_DIR}`);

  if (!req) {
    throw new RuntimeError(`req parameter cannot be falsy.`);
  }
  if (!req.argv) {
    throw new RuntimeError(`req.argv cannot be falsy.`);
  }
  if (!req.env) {
    throw new RuntimeError(`req.env cannot be falsy.`);
  }
  if (!req.scope) {
    throw new RuntimeError(`req.scope cannot be falsy.`);
  }
  if (!req.allowedPrefixes) {
    throw new RuntimeError(`req.scope cannot be falsy.`);
  }
  if (typeof req.preferredPrefix !== "string") {
    throw new RuntimeError(`req.preferredPrefix expected as a string.`);
  }
  if (req.preferredPrefix.length <= 0) {
    throw new RuntimeError(`req.preferredPrefix must be non-blank string.`);
  }
  if (typeof req.scope !== "string") {
    throw new RuntimeError(`req.scope expected as a string.`);
  }
  if (!Array.isArray(req.allowedPrefixes)) {
    throw new RuntimeError(`req.allowedPrefixes expected as an array.`);
  }
  if (req.allowedPrefixes.length <= 0) {
    throw new RuntimeError(`need req.allowedPrefixes as a non-empty array.`);
  }
  if (!Array.isArray(req.excludePatterns)) {
    throw new RuntimeError(`need req.excludePatterns as an array.`);
  }

  const { scope, allowedPrefixes, preferredPrefix } = req;

  const globbyOpts: GlobbyOptions = {
    cwd: PROJECT_DIR,
    ignore: ["**/node_modules", ...req.excludePatterns],
  };

  const includeGlobs = lernaCfg.packages.map((x) => x.concat("/package.json"));

  const pkgJsonPaths = await globby(includeGlobs, globbyOpts);
  console.log(`${TAG} Found ${pkgJsonPaths.length} package.json files.`);

  if (req.autoFixErrors) {
    console.log(`${TAG} auto-fixing enabled. Applying fixes...`);
  }
  const errors: string[] = [];

  const checks = pkgJsonPaths.map(async (pathRel) => {
    const filePathAbs = path.join(PROJECT_DIR, pathRel);
    const pkg: unknown = await fs.readJSON(filePathAbs);
    if (typeof pkg !== "object") {
      errors.push(`ERROR: ${pathRel} package.json cannot be empty.`);
      return;
    }
    if (!hasKey(pkg, "name") || typeof pkg.name !== "string") {
      errors.push(`ERROR: ${pathRel} has no "name" defined at all.`);
      return;
    }
    const name = pkg.name;
    if (name !== name.toLowerCase()) {
      errors.push(`ERROR: ${pathRel} ${name} needs to be lower-case.`);
    }
    if (!name.startsWith(scope)) {
      errors.push(`ERROR: ${pathRel} "name" needs to have ${scope} scope.`);
    }
    if (name.includes("/")) {
      const aPkgName = name.split("/").pop() as string;
      const prefixOk = allowedPrefixes.some((x) => aPkgName.startsWith(x));
      if (!prefixOk) {
        errors.push(`ERROR: ${pathRel} pkg "${aPkgName}" missing "cacti-"`);
      }
    } else {
      const prefixOk = allowedPrefixes.some((x) => name.startsWith(x));
      if (!prefixOk) {
        errors.push(`ERROR: ${pathRel} pkg "${name}" missing "cacti-" prefix`);
      }
    }

    if (req.autoFixErrors) {
      const fixOutcome = fixScopeAndPrefix({ name, preferredPrefix, scope });
      const { hasChanged, newName, oldName } = fixOutcome;
      if (hasChanged) {
        console.log(`${TAG} auto-fixed ${oldName} => ${newName} in ${pathRel}`);
        pkg.name = newName;
        const pkgJson = JSON.stringify(pkg, null, 2);
        await fs.writeFile(filePathAbs, pkgJson, { encoding: "utf-8" });
      }
    }
  });

  await Promise.all(checks);

  console.log(`${TAG} Found ${errors.length} errors in package names.`);
  return [errors.length === 0, errors];
}

function fixScopeAndPrefix(req: {
  readonly name: string;
  readonly scope: string;
  readonly preferredPrefix: string;
}): {
  readonly oldName: string;
  readonly newName: string;
  readonly hasChanged: boolean;
} {
  const oldName = req.name;
  let newName = oldName.toLowerCase();
  if (newName.includes("/")) {
    const pkgName = newName.split("/").pop() as string;
    newName = req.scope.concat("/").concat(pkgName);
  } else {
    newName = req.scope.concat("/").concat(newName);
  }
  const hasChanged = oldName !== newName;
  return { oldName, newName, hasChanged };
}

const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
const isRunningDirectlyViaCLI = nodePath === modulePath;

if (isRunningDirectlyViaCLI) {
  const isAutoFixEnabled =
    process.env.CACTI_CHECK_PKG_NPM_SCOPE_AUTO_FIX_DISABLED !== "true";

  const req = {
    argv: process.argv,
    env: process.env,
    scope: "@hyperledger",
    allowedPrefixes: ["cacti-", "cactus-"],
    preferredPrefix: "cacti-",
    autoFixErrors: isAutoFixEnabled,
    excludePatterns: ["./package.json"],
  };
  await checkPkgNpmScope(req);
}
