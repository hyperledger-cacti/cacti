import path from "node:path";
import { buildContainerImage } from "../public-api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";

export interface IBuildImageBesuAllInOneLatestResponse {
  readonly imageName: Readonly<string>;
  readonly imageVersion: Readonly<string>;
  /**
   * The concatenation of `imageName` a colon character and `imageVersion`.
   */
  readonly imageTag: Readonly<string>;
}

export interface IBuildImageBesuAllInOneLatestRequest {
  readonly logLevel?: Readonly<LogLevelDesc>;
}

export async function buildImageBesuAllInOneLatest(
  req: IBuildImageBesuAllInOneLatestRequest,
): Promise<IBuildImageBesuAllInOneLatestResponse> {
  if (!req) {
    throw new Error("Expected arg req to be truthy.");
  }
  const logLevel: LogLevelDesc = req.logLevel || "WARN";
  const log = LoggerProvider.getOrCreate({
    level: logLevel,
    label: "build-image-besu-all-in-one-latest.ts",
  });
  const projectRoot = path.join(__dirname, "../../../../../../../");

  const buildDirRel = "./tools/docker/besu-all-in-one/";

  const buildDirAbs = path.join(projectRoot, buildDirRel);

  log.info("Invoking container build with build dir: %s", buildDirAbs);

  const imageName = "baio";
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
