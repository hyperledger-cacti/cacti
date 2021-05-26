import os from "os";
import path from "path";
import test, { Test } from "tape-promise/tape";
import type { IncomingMessage } from "http";
import { v4 as uuidV4 } from "uuid";
import fs from "fs-extra";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  HttpEchoContainer,
  Containers,
} from "../../../../main/typescript/public-api";

LoggerProvider.setLogLevel("DEBUG");
const log: Logger = LoggerProvider.getOrCreate({ label: "containers-test" });

test("pushes file to container unharmed", async (t: Test) => {
  const anHttpEchoContainer = new HttpEchoContainer();
  log.debug("Starting HttpEchoContainer...");
  const container = await anHttpEchoContainer.start();
  log.debug("Container started OK.");

  test.onFinish(async () => {
    await anHttpEchoContainer.stop();
    await anHttpEchoContainer.destroy();
  });

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

  t.ok(res, "putArchive() Docker API response OK");
  t.ok(typeof res.statusCode === "number", "API response.statusCode OK");
  const statusCode: number = res.statusCode as number;

  t.ok(statusCode > 199, "putArchive() API res.statusCode > 199");
  t.ok(statusCode < 300, "putArchive() API res.statusCode < 300");
  t.equal(res.statusMessage, "OK", "putArchive() res.statusMessage OK");

  log.debug("Put file result: %o %o", res.statusCode, res.statusMessage);

  const fileAsString2 = await Containers.pullFile(container, dstFilePath);
  t.ok(fileAsString2, "Read back file contents truthy");

  const fileContents2 = JSON.parse(fileAsString2);
  t.ok(fileContents2, "Read back file JSON.parse() OK");
  t.equal(fileContents2.id, fileContents.id, "File UUIDs OK");

  t.end();
});

test("Can obtain docker diagnostics info", async (t: Test) => {
  const httpEchoContainer = new HttpEchoContainer();
  test.onFinish(async () => {
    await httpEchoContainer.stop();
    await httpEchoContainer.destroy();
  });
  t.ok(httpEchoContainer, "httpEchoContainer truthy OK");
  const container = await httpEchoContainer.start();
  t.ok(container, "container truthy OK");

  const diag = await Containers.getDiagnostics({ logLevel: "TRACE" });
  t.ok(diag, "diag truthy OK");

  t.ok(diag.containers, "diag.containers truthy OK");
  t.ok(Array.isArray(diag.containers), "diag.containers is Array OK");
  t.ok(diag.containers.length > 0, "diag.containers not empty array OK");

  t.ok(diag.images, "diag.images truthy OK");
  t.ok(diag.images.length > 0, "diag.images not empty array OK");
  t.ok(Array.isArray(diag.images), "diag.images is Array OK");

  t.ok(diag.info, "diag.info truthy OK");

  t.ok(diag.networks, "diag.networks truthy OK");
  t.ok(diag.networks.length > 0, "diag.networks not empty array OK");
  t.ok(Array.isArray(diag.networks), "diag.networks is Array OK");

  t.ok(diag.version, "diag.version truthy OK");

  t.ok(diag.volumes, "diag.volumes truthy OK");
  t.ok(diag.volumes.Volumes, "diag.volumes.Volumes truthy OK");
  t.ok(Array.isArray(diag.volumes.Volumes), "diag.volumes.Volumes is Array OK");
  t.end();
});

test("Can report error if docker daemon is not accessable", async (t: Test) => {
  const badSocketPath = "/some-non-existent-path/to-make-it-trip-up/";
  try {
    await Containers.getDiagnostics({
      logLevel: "TRACE",
      // pass in an incorrect value for the port so that it fails for sure
      dockerodeOptions: {
        port: 9999,
        socketPath: badSocketPath,
      },
    });
    t.fail("Containers.getDiagnostics was supposed to fail but did not.");
  } catch (ex) {
    t.ok(ex, "exception thrown is truthy OK");
    t.ok(ex.cause, "ex.cause truthy OK");
    t.ok(ex.cause.message, "ex.cause.message truthy OK");
    const causeMsgIsInformative = ex.cause.message.includes(badSocketPath);
    t.true(causeMsgIsInformative, "causeMsgIsInformative");
  }
  t.end();
});
