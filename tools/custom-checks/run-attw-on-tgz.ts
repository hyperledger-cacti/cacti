import esMain from "es-main";
import { getAllTgzPath } from "./get-all-tgz-path";
import { exec } from "child_process";
import { exit } from "process";
import { promisify } from "node:util";

const execPromise = promisify(exec);

export async function runAttwOnTgz(): Promise<[boolean, string[]]> {
  const TAG = "[tools/custom-checks/run-attw-on-tgz.ts]";
  console.log(`${TAG} Fetching .tgz file paths.`);

  const { relativePaths: tgzFilesRelative } = await getAllTgzPath();
  console.log(`${TAG} Found ${tgzFilesRelative.length} .tgz files.`);

  let attwFailedPackages: string[] = [];

  for (const filePath of tgzFilesRelative) {
    try {
      await execCommand("attw", filePath);
    } catch {
      attwFailedPackages.push(filePath);
    }
  }

  const success = attwFailedPackages.length === 0;
  return [success, attwFailedPackages];
}

async function execCommand(
  binaryName: string,
  filePath: string,
): Promise<void> {
  const command = `${binaryName} ./${filePath}`;
  const { stdout } = await execPromise(command);
  console.log(stdout);
}

if (esMain(import.meta)) {
  const attwFailedPackages = await runAttwOnTgz();
  if (attwFailedPackages.length > 0) {
    console.log("Types are wrong for these packages:");
    console.log(attwFailedPackages);
    exit(1);
  }
  exit(0);
}
