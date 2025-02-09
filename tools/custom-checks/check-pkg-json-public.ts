import * as fs from "fs";
import * as path from "path";
import glob from "glob";

export async function checkPkgJsonPublic(): Promise<[boolean, string[]]> {
  const TAG = "[tools/check-pkg-json-public.ts]";
  // Search for all package.json files in the repo, excluding node_modules
  const packageJsonPaths: string[] = glob.sync("**/package.json", {
    ignore: ["**/node_modules/**"],
  });

  let success = true;
  const errors: string[] = [];

  packageJsonPaths.forEach((packageJsonPath) => {
    const fullPath = path.resolve(packageJsonPath);
    let pkg: any;

    try {
      pkg = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    } catch (err) {
      errors.push(`${TAG} Error reading or parsing ${fullPath}: ${err}`);
      success = false;
      return;
    }

    if (pkg.private) {
      errors.push(
        `${TAG} ERROR: Package at ${packageJsonPath} is marked as private.`,
      );
      success = false;
    }
  });

  return [success, errors];
}
