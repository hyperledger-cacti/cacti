import { metrics, UpDownCounter } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
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

export const counters: Map<string, UpDownCounter> = new Map();

/* Monitor Service for SATP Hermes */
export class MonitorService {
  public readonly label = "MonitorService";
  private readonly logger: Logger;
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
      "service.name": "Satp-Hermes-Gateway",
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
        {
          maxQueueSize: 2048,
          scheduledDelayMillis: 5000,
          exportTimeoutMillis: 3000,
          maxExportBatchSize: 512,
        },
      ),
    );
    logsAPI.logs.setGlobalLoggerProvider(loggerProvider);

    this.createLog("info", `Created logger provider`);

    this.logger.info("OpenTelemetry initialization complete");

    this.createMetric("gateways");
    this.createMetric("connected_DLTs");
    this.createMetric("Stage0 - Recovery");
    this.createMetric("Stage1 - Recovery");
    this.createMetric("Stage2 - Recovery");
    this.createMetric("Stage3 - Recovery");
    this.createMetric("created_sessions");
    this.createMetric("initiated_transfers");
    this.createMetric("burned_asset_amount", "Amount of asset burned");
    this.createMetric(
      "successful_transactions",
      "total number of successful transactions",
    );
    this.createMetric("rollbacks", "Number of rollbacks");
  }

  public async createMetric(
    metricName: string,
    description: string = "",
  ): Promise<void> {
    const meter = metrics.getMeterProvider().getMeter("satp-hermes-meter");

    if (!counters.has(metricName)) {
      const counter = meter.createUpDownCounter(metricName, {
        description: description,
      });
      counters.set(metricName, counter);
      this.logger.debug(`Created metric: ${metricName}`);
    }
  }

  public async incrementCounter(
    metricName: string,
    amount: number = 1,
    ctx: Context = context.active(),
  ): Promise<void> {
    const counter = counters.get(metricName);
    if (!counter) {
      throw new Error(
        `Counter ${metricName} not found. Did you call createMetric()?`,
      );
    }
    counter.add(amount, undefined, ctx);
  }

  public startSpan(
    spanName: string,
    tracerName = "satp-hermes-tracer",
    ctx: Context = context.active(),
  ): Span {
    if (!this.sdk) {
      throw new Error("NodeSDK not initialized");
    }

    this.createLog(
      "debug",
      `Starting span: ${spanName} with tracer: ${tracerName} in context: ${ctx}`,
    );

    const tracer = trace.getTracer(tracerName);
    const parentSpan = trace.getSpan(ctx);
    let span: Span;

    if (!parentSpan) {
      // No active span, create a new root span
      span = tracer.startSpan(spanName);
    } else {
      // Create a child span from the current context
      const newContext = trace.setSpan(ctx, parentSpan);
      span = tracer.startSpan(spanName, undefined, newContext);
    }

    return span;
  }

  public async createLog(
    level: LogLevelDesc = "info",
    ...message: unknown[]
  ): Promise<void> {
    const logger = logsAPI.logs.getLogger("satp-hermes-logger");
    logger.emit({
      body: message,
      severityText: level as string,
    } as logsAPI.LogRecord);
  }

  public async shutdown(): Promise<void> {
    this.logger.info("Shutting down MonitorService...");
    if (this.sdk) {
      this.sdk.shutdown();
      this.sdk = undefined;
    }
    this.logger.info("MonitorService shutdown complete");
  }
}
