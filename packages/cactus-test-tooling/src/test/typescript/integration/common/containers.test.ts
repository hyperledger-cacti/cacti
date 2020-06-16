import os from "os";
import path from "path";
import { IncomingMessage } from "http";
// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import { v4 as uuidV4 } from "uuid";
import fs from "fs-extra";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  HttpEchoContainer,
  Containers,
} from "../../../../main/typescript/public-api";

LoggerProvider.setLogLevel("DEBUG");
const log: Logger = LoggerProvider.getOrCreate({ label: "containers-test" });

tap.test("pushes file to container unharmed", async (assert: any) => {
  const anHttpEchoContainer = new HttpEchoContainer();
  log.debug("Starting HttpEchoContainer...");
  const container = await anHttpEchoContainer.start();
  log.debug("Container started OK.");
  assert.tearDown(() => anHttpEchoContainer.stop());
  assert.tearDown(() => anHttpEchoContainer.destroy());

  const srcFileName = uuidV4();
  const srcFileDir = os.tmpdir();
  const dstFileDir = "/";
  const dstFileName = srcFileName;
  const srcFilePath = path.join(srcFileDir, srcFileName);
  const dstFilePath = path.join(dstFileDir, dstFileName);

  const fileContents = {
    id: srcFileName,
    message: "Hello world!",
  };

  const srcFileAsString = JSON.stringify(fileContents);
  fs.writeFileSync(srcFilePath, srcFileAsString);

  const res: IncomingMessage = await Containers.putFile({
    containerOrId: container,
    srcFileDir,
    srcFileName,
    dstFileDir,
    dstFileName,
  });

  assert.ok(res, "putArchive() Docker API response OK");
  assert.ok(typeof res.statusCode === "number", "API response.statusCode OK");
  const statusCode: number = res.statusCode as number;

  assert.ok(statusCode > 199, "putArchive() API res.statusCode > 199");
  assert.ok(statusCode < 300, "putArchive() API res.statusCode < 300");
  assert.equal(res.statusMessage, "OK", "putArchive() res.statusMessage OK");

  log.debug("Put file result: %o %o", res.statusCode, res.statusMessage);

  const fileAsString2 = await Containers.pullFile(container, dstFilePath);
  assert.ok(fileAsString2, "Read back file contents truthy");

  const fileContents2 = JSON.parse(fileAsString2);
  assert.ok(fileContents2, "Read back file JSON.parse() OK");
  assert.equal(fileContents2.id, fileContents.id, "File UUIDs OK");

  assert.end();
});
