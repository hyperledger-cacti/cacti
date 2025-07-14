import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import { SATPGateway, SATPGatewayConfig } from "../plugin-satp-hermes-gateway";
import { validateOrReject } from "class-validator";
import { context, SpanStatusCode, trace } from "@opentelemetry/api";

export class PluginFactorySATPGateway extends PluginFactory<
  SATPGateway,
  SATPGatewayConfig,
  IPluginFactoryOptions
> {
  async create(pluginOptions: SATPGatewayConfig): Promise<SATPGateway> {
    const fnTag = `PluginFactorySATPGateway#create()`;
    const tracer = trace.getTracer("satp-hermes-tracer");
    const span = tracer.startSpan(fnTag);
    const ctx = trace.setSpan(context.active(), span);
    return context.with(ctx, async () => {
      try {
        const coordinator = new SATPGateway(pluginOptions);

        try {
          const validationOptions = pluginOptions.validationOptions;
          await validateOrReject(coordinator, validationOptions);
          return coordinator;
        } catch (errors) {
          throw new Error(
            `Caught promise rejection (validation failed). Errors: ${errors}`,
          );
        }
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
