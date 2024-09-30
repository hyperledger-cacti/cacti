import esMain from "es-main";
import { getAllTgzPath } from "./get-all-tgz-path";
import { exit } from "process";
import { rm } from "fs";
import { spawn } from "child_process";

// New function to stream subprocess output in real-time
function spawnPromise(
  command: string,
  args: string[],
  options = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: true, ...options });
    let output = "";

    // Append stdout and stderr to the output string
    child.stdout.on("data", (data) => {
      process.stdout.write(data);
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      process.stderr.write(data);
      output += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        const error = new Error(`Process exited with code ${code}`);
        (error as any).output = output;
        reject(error);
      }
    });

    child.on("error", (err) => reject(err));
  });
}

async function cleanUpTgzFiles(): Promise<void> {
  const TAG = "[tools/custom-checks/run-attw-on-tgz.ts]";
  console.log(`${TAG} Cleaning up existing .tgz files...`);

  const { relativePaths: tgzFilesRelative } = await getAllTgzPath();

  for (const filePath of tgzFilesRelative) {
    await rm(filePath, { recursive: true, force: true }, () => {});
    console.log(`${TAG} Deleted ${filePath}`);
  }
}

export async function runAttwOnTgz(): Promise<[boolean, string[]]> {
  await cleanUpTgzFiles();

  const TAG = "[tools/custom-checks/run-attw-on-tgz.ts]";
  await execCommand("yarn lerna exec 'npm pack'", true);
  console.log(`${TAG} Packaging .tgz files`);

  console.log(`${TAG} Fetching .tgz file paths.`);
  const { relativePaths: tgzFilesRelative } = await getAllTgzPath();

  const attwFailedPackages: string[] = [];

  for (const filePath of tgzFilesRelative) {
    try {
      const output = await execCommand("attw", filePath);
      console.log(output);
    } catch (error: any) {
      attwFailedPackages.push(
        `ERROR ${filePath}: ${error.message}\n${error.output || ""}`,
      );
    }
  }

  const success = attwFailedPackages.length === 0;
  return [success, attwFailedPackages];
}

async function execCommand(
  binaryName: string,
  argument: string | boolean,
): Promise<string> {
  let command;
  if (typeof argument === "boolean") {
    command = binaryName;
  } else if (typeof argument === "string") {
    command = `${binaryName} ./${argument}`;
  } else {
    throw new Error("Invalid arguments for execCommand");
  }

  return await spawnPromise(command, []);
}

if (esMain(import.meta)) {
  const [success, attwFailedPackages] = await runAttwOnTgz();
  if (!success) {
    console.log("Types are wrong for these packages:");
    console.log(attwFailedPackages);
    exit(1);
  }
  exit(0);
}
