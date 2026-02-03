import path from "node:path";
import { buildContainerImage } from "../public-api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger-cacti/cactus-common";

export interface IBuildImageCordaAllInOneV412Response {
  readonly imageName: Readonly<string>;
  readonly imageVersion: Readonly<string>;
  /**
   * The concatenation of `imageName` a colon character and `imageVersion`.
   */
  readonly imageTag: Readonly<string>;
}

export interface IBuildImageCordaAllInOneV412Request {
  readonly logLevel?: Readonly<LogLevelDesc>;
}

export async function buildImageCordaAllInOneV412(
  req: IBuildImageCordaAllInOneV412Request,
): Promise<IBuildImageCordaAllInOneV412Response> {
  if (!req) {
    throw new Error("Expected arg req to be truthy.");
  }
  const logLevel: LogLevelDesc = req.logLevel || "WARN";
  const log = LoggerProvider.getOrCreate({
    level: logLevel,
    label: "build-image-corda-all-in-one-v4-12.ts",
  });
  const projectRoot = path.join(__dirname, "../../../../../../../");

  const buildDirRel = "./tools/docker/corda-all-in-one/corda-v4_12/";

  const buildDirAbs = path.join(projectRoot, buildDirRel);

  log.info("Invoking container build with build dir: %s", buildDirAbs);

  const imageName = "caio412";
  const imageVersion = "latest";
  const imageTag = `${imageName}:${imageVersion}`;

  await buildContainerImage({
    buildDir: buildDirAbs,
    imageFile: "Dockerfile",
    imageTag,
    logLevel: logLevel,
  });

  return { imageName, imageVersion, imageTag };
}
