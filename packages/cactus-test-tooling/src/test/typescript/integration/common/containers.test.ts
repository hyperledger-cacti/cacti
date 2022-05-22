import os from "os";
import path from "path";
import "jest-extended";
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
const testCase = "pushes file to container unharmed";

describe(testCase, () => {
  let container: any;
  const anHttpEchoContainer = new HttpEchoContainer();
  console.log("Starting HttpEchoContainer...");
  const httpEchoContainer = new HttpEchoContainer();

  beforeAll(async () => {
    container = await anHttpEchoContainer.start();
    log.debug("Container started OK.");
  });

  afterAll(async () => {
    await anHttpEchoContainer.stop();
    await anHttpEchoContainer.destroy();
    await httpEchoContainer.stop();
    await httpEchoContainer.destroy();
  });

  test(testCase, async () => {
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
    {
      const res: IncomingMessage = await Containers.putFile({
        containerOrId: container,
        srcFileDir,
        srcFileName,
        dstFileDir,
        dstFileName,
      });

      expect(res).toBeTruthy();
      expect(typeof res.statusCode).toBe("number");
      const statusCode: number = res.statusCode as number;

      expect(statusCode).toBeGreaterThan(199);
      expect(statusCode).toBeLessThan(300);
      expect(res.statusMessage).toEqual("OK");

      log.debug("Put file result: %o %o", res.statusCode, res.statusMessage);

      const fileAsString2 = await Containers.pullFile(container, dstFilePath);
      expect(fileAsString2).toBeTruthy();

      const fileContents2 = JSON.parse(fileAsString2);
      expect(fileContents2).toBeTruthy();
      expect(fileContents2.id).toEqual(fileContents.id);
    }

    {
      expect(httpEchoContainer).toBeTruthy();
      const container = await httpEchoContainer.start();
      expect(container).toBeTruthy();

      const diag = await Containers.getDiagnostics({ logLevel: "TRACE" });
      expect(diag).toBeTruthy();

      expect(diag.containers).toBeTruthy();
      expect(Array.isArray(diag.containers)).toBeTruthy();
      expect(diag.containers.length > 0).toBeTruthy();

      expect(diag.images).toBeTruthy();
      expect(diag.images.length > 0).toBeTruthy();
      expect(Array.isArray(diag.images)).toBeTruthy();

      expect(diag.info).toBeTruthy();

      expect(diag.networks).toBeTruthy();
      expect(diag.networks.length > 0).toBeTruthy();
      expect(Array.isArray(diag.networks)).toBeTruthy();

      expect(diag.version).toBeTruthy();

      expect(diag.volumes).toBeTruthy();
      expect(diag.volumes.Volumes).toBeTruthy();
      expect(Array.isArray(diag.volumes.Volumes)).toBeTruthy();
    }

    {
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
        fail(Containers.getDiagnostics);
      } catch (ex: unknown) {
        expect(ex).toBeTruthy();
        const connectEN = "connect ENOENT ";
        const fullBadPath = connectEN.concat(badSocketPath);
        expect(ex).toHaveProperty(["cause", "message"], fullBadPath);
      }
    }
  });
});
