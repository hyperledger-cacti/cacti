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
import { UninitializedMonitorServiceError } from "../../cross-chain-mechanisms/common/errors";

/**
 * Options for configuring the MonitorService.
 *
 * @property {LogLevelDesc} [logLevel] - The log level for the MonitorService.
 * @property {string} [otelMetricsExporterUrl] - The URL for the OpenTelemetry metrics exporter.
 * @property {string} [otelLogsExporterUrl] - The URL for the OpenTelemetry logs exporter.
 * @property {string} [otelTracesExporterUrl] - The URL for the OpenTelemetry traces exporter.
 * @property {boolean} [enabled] - Whether the MonitorService is enabled. Defaults to true unless in test environment.
 */
export interface MonitorServiceOptions {
  logLevel?: LogLevelDesc;
  otelMetricsExporterUrl?: string;
  otelLogsExporterUrl?: string;
  otelTracesExporterUrl?: string;
  enabled?: boolean;
}

/**
 * A map to hold counters for metrics.
 * The key is the metric name, and the value is the UpDownCounter instance.
 */
export const counters: Map<string, UpDownCounter> = new Map();

/**
 * The MonitorService class is responsible for allowing observability into the system's behavior.
 *
 * @class MonitorService
 */
export class MonitorService {
  public readonly label = "MonitorService";
  private readonly logger: Logger;
  private sdk: NodeSDK | undefined;
  private readonly otelMetricsExporterUrl: string;
  private readonly otelLogsExporterUrl: string;
  private readonly otelTracesExporterUrl: string;
  private readonly isEnabled: boolean;

  private static instance: MonitorService | undefined;

  public static createOrGetMonitorService(
    options: MonitorServiceOptions,
  ): MonitorService {
    if (!MonitorService.instance) {
      MonitorService.instance = new MonitorService(options);
    }
    return MonitorService.instance;
  }

  /**
   * Creates an instance of MonitorService.
   *
   * @param options - The configuration options for the MonitorService.
   */
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
    this.isEnabled = options.enabled ?? process.env.NODE_ENV !== "test";
  }

  /**
   * Initializes the MonitorService and creates the metrics.
   * @returns {Promise<void>} A promise that resolves when the MonitorService is successfully initialized.
   */
  public async init(): Promise<void> {
    const fnTag = `${this.label}#init()`;
    this.logger.info(`${fnTag} - Initializing MonitorService...`);
    if (!this.isEnabled) {
      this.logger.info(`${fnTag} - MonitorService disabled by config.`);
      return;
    }

    const resource = new Resource({
      "service.name": "Satp-Hermes-Gateway",
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
          exportIntervalMillis: 500,
        }),
        instrumentations: [getNodeAutoInstrumentations()],
      });

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

      this.sdk.start();

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
      this.createLog(
        "info",
        `${fnTag} - MonitorService initialization complete`,
      );
      this.logger.info(`${fnTag} - MonitorService initialization complete`);
    } else {
      this.logger.warn(
        `${fnTag} - MonitorService is already initialized, skipping init.`,
      );
    }
  }

  /**
   * Creates a metric with the given name and description.
   *
   * @param metricName - The name of the metric to create.
   * @param description - A description of the metric.
   * @throws {UninitializedMonitorServiceError} If the NodeSDK is not initialized.
   * @returns {Promise<void>} A promise that resolves when the metric is created.
   */
  public async createMetric(
    metricName: string,
    description: string = "",
  ): Promise<void> {
    const fnTag = `${this.label}#createMetric()`;
    if (!this.isEnabled) return;
    if (!this.sdk) {
      throw new UninitializedMonitorServiceError(
        `${fnTag} - NodeSDK not initialized`,
      );
    }

    const meter = metrics.getMeterProvider().getMeter("satp-hermes-meter");

    if (!counters.has(metricName)) {
      const counter = meter.createUpDownCounter(metricName, {
        description: description,
      });
      counters.set(metricName, counter);
      this.logger.debug(`${fnTag} - Created metric: ${metricName}`);
      this.createLog("debug", `${fnTag} - Created metric: ${metricName}`);
    } else {
      this.logger.warn(
        `${fnTag} - Metric ${metricName} already exists. Skipping creation.`,
      );
      this.createLog("warn", `${fnTag} - Metric ${metricName} already exists.`);
    }
  }

  /**
   * Increments the counter for the given metric by the specified amount.
   *
   * @param metricName - The name of the metric to increment.
   * @param amount - The amount to increment the counter by (default is 1).
   * @param ctx - The context in which to increment the counter (default is the current context).
   * @throws {UninitializedMonitorServiceError} If the NodeSDK is not initialized.
   * @throws {Error} If the counter for the given metric does not exist.
   * @returns {Promise<void>} A promise that resolves when the counter is incremented.
   */
  public async incrementCounter(
    metricName: string,
    amount: number = 1,
    ctx: Context = context.active(),
  ): Promise<void> {
    const fnTag = `${this.label}#incrementCounter()`;
    if (!this.isEnabled) return;
    if (!this.sdk) {
      throw new UninitializedMonitorServiceError(
        `${fnTag} - NodeSDK not initialized`,
      );
    }
    const counter = counters.get(metricName);
    if (!counter) {
      throw new Error(
        `${fnTag} - Counter ${metricName} not found. Did you call createMetric()?`,
      );
    }
    counter.add(amount, undefined, ctx);
    this.logger.debug(
      `${fnTag} - Incremented counter: ${metricName} by ${amount}`,
    );
    this.createLog(
      "debug",
      `${fnTag} - Incremented counter: ${metricName} by ${amount}`,
    );
  }

  /**
   * Starts a new span with the given name and tracer.
   *
   * @param spanName - The name of the span to start.
   * @param tracerName - The name of the tracer to use (default is "satp-hermes-tracer").
   * @param ctx - The context in which to start the span (default is the current context).
   * @throws {UninitializedMonitorServiceError} If the NodeSDK is not initialized.
   * @returns {Object} An object containing the started span and the updated context.
   */
  public startSpan(
    spanName: string,
    tracerName = "satp-hermes-tracer",
    ctx: Context = context.active(),
  ): { span: Span; context: Context } {
    const fnTag = `${this.label}#startSpan()`;
    const tracer = trace.getTracer(tracerName);
    const span = tracer.startSpan(spanName);
    if (!this.isEnabled) return { span: span, context: ctx };
    if (!this.sdk) {
      throw new UninitializedMonitorServiceError(
        `${fnTag} - NodeSDK not initialized`,
      );
    }

    const new_ctx = trace.setSpan(ctx, span);
    this.createLog(
      "debug",
      `${fnTag} - Starting span: ${spanName} with tracer: ${tracerName} in context: ${ctx}`,
    );
    this.logger.debug(
      `${fnTag} - Started span: ${spanName} with tracer: ${tracerName} in context: ${new_ctx}`,
    );
    return { span, context: new_ctx };
  }

  /**
   * Creates a log entry with the specified level and message.
   *
   * @param level - The log level (default is "info").
   * @param message - The message to log.
   * @throws {UninitializedMonitorServiceError} If the NodeSDK is not initialized.
   * @returns {Promise<void>} A promise that resolves when the log entry is created.
   */
  public async createLog(
    level: LogLevelDesc = "info",
    ...message: unknown[]
  ): Promise<void> {
    const fnTag = `${this.label}#createLog()`;
    if (!this.isEnabled) return;
    if (!this.sdk) {
      throw new UninitializedMonitorServiceError(
        `${fnTag} - NodeSDK not initialized`,
      );
    }
    const logger = logsAPI.logs.getLogger("satp-hermes-logger");
    logger.emit({
      body: message,
      severityText: level as string,
    } as logsAPI.LogRecord);
  }

  /**
   * Shuts down the MonitorService and cleans up resources.
   *
   * @returns {Promise<void>} A promise that resolves when the MonitorService is successfully shut down.
   */
  public async shutdown(): Promise<void> {
    const fnTag = `${this.label}#shutdown()`;
    this.logger.info(`${fnTag} - Shutting down MonitorService...`);
    if (!this.isEnabled) return;
    if (this.sdk) {
      await this.sdk.shutdown();
      this.sdk = undefined;
      this.logger.info(`${fnTag} - MonitorService shutdown complete`);
    } else this.logger.warn(`${fnTag} - MonitorService is already shut down.`);
  }

  /**
   * Gets the NodeSDK instance if it is initialized.
   *
   * @returns {NodeSDK | undefined} The NodeSDK instance or undefined if not initialized.
   */
  public getSDK(): NodeSDK | undefined {
    return this.sdk;
  }
}
