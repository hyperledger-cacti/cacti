import path from "node:path";
import { buildContainerImage } from "../public-api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";

export interface IBuildImageConnectorCordaServerResponse {
  readonly imageName: Readonly<string>;
  readonly imageVersion: Readonly<string>;
  /**
   * The concatenation of `imageName` a colon character and `imageVersion`.
   */
  readonly imageTag: Readonly<string>;
}

export interface IBuildImageConnectorCordaServerRequest {
  readonly logLevel?: Readonly<LogLevelDesc>;
}

export async function buildImageConnectorCordaServer(
  req: IBuildImageConnectorCordaServerRequest,
): Promise<IBuildImageConnectorCordaServerResponse> {
  if (!req) {
    throw new Error("Expected arg req to be truthy.");
  }
  const logLevel: LogLevelDesc = req.logLevel || "WARN";
  const log = LoggerProvider.getOrCreate({
    level: logLevel,
    label: "build-image-connector-corda-server.ts",
  });
  const projectRoot = path.join(__dirname, "../../../../../../../");

  const buildDirRel =
    "./packages/cactus-plugin-ledger-connector-corda/src/main-server/";

  const buildDirAbs = path.join(projectRoot, buildDirRel);

  log.info("Invoking container build with build dir: %s", buildDirAbs);

  const imageName = "cccs";
  const imageVersion = "latest";
  const imageTag = `${imageName}:${imageVersion}`;

  await buildContainerImage({
    buildDir: buildDirAbs,
    imageFile: "Dockerfile",
    imageTag,
    logLevel: logLevel,
  });

  log.info("Building Corda v4 JVM Connector finished OK");

  return { imageName, imageVersion, imageTag };
}
