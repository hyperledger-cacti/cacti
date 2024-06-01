import fs from "node:fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { ReadableStream } from "stream/web";
import { fileURLToPath, parse } from "url";
import path from "path";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { RuntimeError } from "run-time-error";

const TAG = "[tools/download-file-to-disk.ts]";

export interface IDownloadFileToDiskReq {
  readonly url: string;
  readonly outputFilePath: string;
}

export interface IDownloadFileToDiskRes {
  readonly url: string;
  readonly outputFilePath: string;
}

const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
const isRunningDirectlyViaCLI = nodePath === modulePath;

const main = async (argv: string[], env: NodeJS.ProcessEnv) => {
  const req = await createRequest(argv, env);
  await downloadFileToDisk(req);
};

if (isRunningDirectlyViaCLI) {
  main(process.argv, process.env);
}

async function createRequest(
  argv: string[],
  env: NodeJS.ProcessEnv,
): Promise<IDownloadFileToDiskReq> {
  if (!argv) {
    throw new RuntimeError(`Process argv cannot be falsy.`);
  }
  if (!env) {
    throw new RuntimeError(`Process env cannot be falsy.`);
  }

  const optOutputFilePath =
    "The absolute path on disk where the downloaded file will be streamed.";

  const optUrl = "The URL to download from.";

  const parsedCfg = await yargs(hideBin(argv))
    .env("CACTI_")
    .option("url", {
      alias: "u",
      type: "string",
      demandOption: false,
      description: optUrl,
      default: hideBin(argv)[0],
    })
    .option("output-file-path", {
      alias: "o",
      type: "string",
      description: optOutputFilePath,
      defaultDescription: "Defaults to the current working directory.",
      default: "./",
    }).argv;

  const url = parsedCfg.url;

  console.log("%s parsing URL '%s'", TAG, url);
  const { pathname } = parse(url);
  const pathnameOrDefault = pathname || "new_download_file";
  const filename = path.basename(pathnameOrDefault);

  const endsWithDirSeparator = parsedCfg.outputFilePath.endsWith(path.sep);

  const outputFilePath = endsWithDirSeparator
    ? path.join(parsedCfg.outputFilePath, filename)
    : parsedCfg.outputFilePath;

  const req: IDownloadFileToDiskReq = {
    url,
    outputFilePath,
  };

  return req;
}

export async function downloadFileToDisk(
  req: IDownloadFileToDiskReq,
): Promise<unknown> {
  const { url, outputFilePath } = req;
  console.log("%s downloading %s into %s ...", TAG, url, outputFilePath);
  const stream = fs.createWriteStream(req.outputFilePath);
  const { body } = await fetch(req.url);
  if (!body) {
    throw new RuntimeError("fetching %s did not yield a response body.", url);
  }
  const bodyNodeJs = body as unknown as ReadableStream;
  await finished(Readable.fromWeb(bodyNodeJs).pipe(stream));
  console.log("%s downloaded %s into %s OK", TAG, url, outputFilePath);
  return { outputFilePath, url };
}
