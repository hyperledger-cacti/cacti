import { FastifyInstance } from "fastify";
import {
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { stringifyBigIntReplacer } from "./stringify-big-int-replacer";

export const CACTI_CORE_CONFIGURE_FASTIFY_APP_BASE_MARKER =
  "CACTI_CORE_CONFIGURE_FASTIFY_APP_BASE_MARKER";

export interface IConfigureFastifyAppContext {
  readonly logLevel?: LogLevelDesc;
  readonly app: FastifyInstance;
}

export async function configureFastifyAppBase(
  ctx: IConfigureFastifyAppContext,
): Promise<void> {
  const fn = "configureFastifyAppBase()";
  Checks.truthy(ctx, `${fn} arg1 ctx`);
  Checks.truthy(ctx.app, `${fn} arg1 ctx.app`);

  const logLevel: LogLevelDesc = ctx.logLevel || "WARN";
  const log = LoggerProvider.getOrCreate({ level: logLevel, label: fn });

  log.debug("ENTRY");

  if (ctx.app.hasDecorator(CACTI_CORE_CONFIGURE_FASTIFY_APP_BASE_MARKER)) {
    throw new Error("Fastify instance has already been configured.");
  }

  log.debug("Fastify JSON parsing enabled by default");

  ctx.app.addHook("onSend", async (request, reply, payload) => {
    if (typeof payload === "string") {
      try {
        return JSON.stringify(JSON.parse(payload), stringifyBigIntReplacer);
      } catch (err) {
        return payload;
      }
    }
    return payload;
  });

  ctx.app.decorate(CACTI_CORE_CONFIGURE_FASTIFY_APP_BASE_MARKER, true);

  log.debug("EXIT");
}
