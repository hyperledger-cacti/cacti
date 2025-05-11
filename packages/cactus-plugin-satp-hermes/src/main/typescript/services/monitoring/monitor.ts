import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { metrics } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import {
  SimpleSpanProcessor,
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  LoggerProvider as OtelLoggerProvider,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import * as logsAPI from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { Context, context, trace, Span } from "@opentelemetry/api";
import { Resource } from "@opentelemetry/resources";

export interface MonitorServiceOptions {
  logLevel?: LogLevelDesc;
  otelMetricsExporterUrl?: string;
  otelLogsExporterUrl?: string;
  otelTracesExporterUrl?: string;
}

export class MonitorService {
  public readonly label = "MonitorService";
  private readonly logger: Logger;
  private tracerProvider: NodeTracerProvider | undefined;
  private sdk: NodeSDK | undefined;
  private readonly otelMetricsExporterUrl: string;
  private readonly otelLogsExporterUrl: string;
  private readonly otelTracesExporterUrl: string;

  private static instance: MonitorService | undefined;

  public static createOrGetMonitorService(
    options: MonitorServiceOptions,
  ): MonitorService {
    if (!MonitorService.instance) {
      MonitorService.instance = new MonitorService(options);
    }
    return MonitorService.instance;
  }

  private constructor(options: MonitorServiceOptions) {
    this.logger = LoggerProvider.getOrCreate({
      level: (options.logLevel || "info") as LogLevelDesc,
      label: this.label,
    });
    this.otelMetricsExporterUrl =
      options.otelMetricsExporterUrl || "http://localhost:4318/v1/metrics";
    this.otelTracesExporterUrl =
      options.otelTracesExporterUrl || "http://localhost:4318/v1/traces";
    this.otelLogsExporterUrl =
      options.otelLogsExporterUrl || "http://localhost:4318/v1/logs";
  }

  public async init(): Promise<void> {
    this.logger.info("Initializing MonitorService...");

    const resource = new Resource({
      // Change to actual resource attributes
      "service.name": "my-node-service",
      "service.version": "1.0.0",
      "deployment.environment": "development",
    });

    if (!this.sdk) {
      this.sdk = new NodeSDK({
        resource: resource,
        traceExporter: new OTLPTraceExporter({
          url: this.otelTracesExporterUrl,
        }),
        metricReader: new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: this.otelMetricsExporterUrl,
          }),
        }),
        instrumentations: [getNodeAutoInstrumentations()],
      });
    }

    this.sdk.start();

    // Set up logs
    const loggerProvider = new OtelLoggerProvider({
      resource,
    });
    loggerProvider.addLogRecordProcessor(
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: this.otelLogsExporterUrl,
        }),
      ),
    );
    logsAPI.logs.setGlobalLoggerProvider(loggerProvider);

    this.logger.info("OpenTelemetry initialization complete");
  }

  public async createMetric(metricName: string): Promise<void> {
    if (!this.sdk) {
      throw new Error("NodeSDK not initialized");
    }
    const meter = metrics.getMeter("satp-hermes-meter");
    meter.createCounter(metricName);
    this.logger.debug(`Created metric: ${metricName}`);
  }

  public async incrementCounter(metricName: string, amount = 1): Promise<void> {
    if (!this.sdk) {
      throw new Error("NodeSDK not initialized");
    }
    const meter = metrics.getMeter("satp-hermes-meter");
    const counter = meter.createCounter(metricName);
    counter.add(amount);
  }

  // TO DO
  public startSpan(
    tracerName = "satp-hermes-tracer",
    spanName = "generateSpanID",
    ctx: Context = context.active(),
  ): Span {
    if (!this.tracerProvider) {
      this.tracerProvider = new NodeTracerProvider();
      this.tracerProvider.addSpanProcessor(
        new SimpleSpanProcessor(new ConsoleSpanExporter()),
      );
      this.tracerProvider.register();
    }
    const tracer = this.tracerProvider.getTracer(tracerName);
    const parentSpan = trace.getSpan(ctx);
    let newSpan: Span;

    if (!parentSpan) {
      // No active span, so create a new root span
      newSpan = tracer.startSpan(spanName);
    } else {
      // Create a subspan under the existing span
      const newContext = trace.setSpan(ctx, parentSpan);
      newSpan = tracer.startSpan(spanName, undefined, newContext);
    }

    return newSpan;
  }

  public async createLog(
    message: string,
    level: LogLevelDesc = "info",
  ): Promise<void> {
    const logger = logsAPI.logs.getLogger("satp-hermes-logger");
    logger.emit({
      body: message,
      severityText: level as string,
    });
  }
}
