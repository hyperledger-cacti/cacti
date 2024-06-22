import Docker, { ImageBuildContext, ImageBuildOptions } from "dockerode";

import {
  createRuntimeErrorWithCause,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

export interface IBuildContainerImageRequest {
  readonly logLevel: LogLevelDesc;
  readonly buildDir: Readonly<string>;
  readonly imageFile: Readonly<string>;
  readonly imageTag: Readonly<string>;
  readonly dockerEngine?: Readonly<Docker>;
  readonly dockerodeImageBuildOptions?: Partial<ImageBuildOptions>;
  readonly dockerodeImageBuildContext?: Partial<ImageBuildContext>;
}

export interface IBuildImageResultFail {
  readonly errorDetail: {
    readonly code: Readonly<number>;
    readonly message: Readonly<string>;
  };
  readonly error: string;
}

export function isIBuildImageResultFail(
  x: unknown,
): x is IBuildImageResultFail {
  if (!x) {
    return false;
  }
  return (
    typeof (x as IBuildImageResultFail).error === "string" &&
    typeof (x as IBuildImageResultFail).errorDetail === "object" &&
    typeof (x as IBuildImageResultFail).errorDetail.code === "number" &&
    typeof (x as IBuildImageResultFail).errorDetail.message === "string"
  );
}

export async function buildContainerImage(
  req: Readonly<IBuildContainerImageRequest>,
): Promise<unknown> {
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

  const buildErrors: IBuildImageResultFail[] = [];
  stream.on("data", (data: unknown) => {
    if (data instanceof Buffer) {
      const logRowJson = data.toString("utf-8");
      const logRow = JSON.parse(logRowJson);
      if (isIBuildImageResultFail(logRow)) {
        buildErrors.push(logRow);
      }
      log.debug("[Build]: %s", logRowJson);
    }
  });

  const out = await new Promise((resolve, reject) => {
    dockerEngine.modem.followProgress(stream, (err, res) =>
      err ? reject(err) : resolve(res),
    );
  });

  if (buildErrors.length > 0) {
    const eMsg = `Could not build image ${req.imageTag} from ${req.buildDir}/${req.imageFile}`;
    throw createRuntimeErrorWithCause(eMsg, { buildErrors });
  }
  return out;
}
