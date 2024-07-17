import Docker, { ImageBuildContext, ImageBuildOptions } from "dockerode";

import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";

export interface IBuildContainerImageRequest {
  readonly logLevel: LogLevelDesc;
  readonly buildDir: Readonly<string>;
  readonly imageFile: Readonly<string>;
  readonly imageTag: Readonly<string>;
  readonly dockerEngine?: Readonly<Docker>;
  readonly dockerodeImageBuildOptions?: Partial<ImageBuildOptions>;
  readonly dockerodeImageBuildContext?: Partial<ImageBuildContext>;
}

export async function buildContainerImage(
  req: Readonly<IBuildContainerImageRequest>,
): Promise<void> {
  if (!req) {
    throw new Error("Expected arg req to be truthy.");
  }
  if (!req.buildDir) {
    throw new Error("Expected arg req.buildDir to be truthy.");
  }
  if (!req.imageFile) {
    throw new Error("Expected arg req.imageFile to be truthy.");
  }
  const logLevel: LogLevelDesc = req.logLevel || "INFO";
  const dockerEngine = req.dockerEngine || new Docker();

  const log = LoggerProvider.getOrCreate({
    label: "build-container-image",
    level: logLevel,
  });

  const imageBuildOptions: ImageBuildOptions = {
    ...req.dockerodeImageBuildOptions,
    t: req.imageTag,
  };
  log.debug("imageBuildOptions=%o", imageBuildOptions);

  const imageBuildContext: ImageBuildContext = {
    context: req.buildDir,
    src: [req.imageFile, "."],
    ...req.dockerodeImageBuildContext,
  };
  log.debug("imageBuildContext=%o", imageBuildContext);

  const stream = await dockerEngine.buildImage(
    imageBuildContext,
    imageBuildOptions,
  );

  stream.on("data", (data: unknown) => {
    if (data instanceof Buffer) {
      log.debug("[Build]: ", data.toString("utf-8"));
    }
  });

  await new Promise((resolve, reject) => {
    dockerEngine.modem.followProgress(stream, (err, res) =>
      err ? reject(err) : resolve(res),
    );
  });
}
