import {
  metrics,
  UpDownCounter,
  Counter,
  Histogram,
  ObservableResult,
  Context,
  context,
  trace,
  Span,
} from "@opentelemetry/api";
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
import {
  ExplicitBucketHistogramAggregation,
  InstrumentType,
  PeriodicExportingMetricReader,
  View,
} from "@opentelemetry/sdk-metrics";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
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


type MetricEntry =
  | { type: "counter"; metric: Counter }
  | { type: "updown"; metric: UpDownCounter };

/**
 * A map to hold counters for metrics.
 * The key is the metric name, and the value is a MetricEntry (either Counter or UpDownCounter) instance.
 */
export const counters: Map<string, MetricEntry> = new Map();

/**
 * A map to hold histograms for metrics.
 * The key is the metric name, and the value is the Histogram instance.
 */
export const histograms: Map<string, Histogram> = new Map();

/**
 * A map to hold gauges for metrics.
 * The key is the metric name, and the value is a function that returns the gauge value.
 */
export const gauges: Map<string, () => number> = new Map();

/**
 * The MonitorService class is responsible for allowing observability into the system's behavior.
 *
 * @class MonitorService
 */
export class MonitorService {
  public readonly label: string = "MonitorService";
  private readonly logger: Logger;
  private sdk: NodeSDK | undefined;
  private readonly otelMetricsExporterUrl: string;
  private readonly otelLogsExporterUrl: string;
  private readonly otelTracesExporterUrl: string;
  private readonly isEnabled: boolean;
  private static instance: MonitorService | undefined;

  /**
   * Creates or retrieves the singleton instance of MonitorService.
   *
   * @param options - The configuration options for the MonitorService.
   * @returns {MonitorService} The singleton instance of MonitorService.
   */
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
      options.otelMetricsExporterUrl ??
      (process.env.OTEL_EXPORTER_OTLP_ENDPOINT
        ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`
        : "http://localhost:4318/v1/metrics");

    this.otelTracesExporterUrl =
      options.otelTracesExporterUrl ??
      (process.env.OTEL_EXPORTER_OTLP_ENDPOINT
        ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`
        : "http://localhost:4318/v1/traces");

    this.otelLogsExporterUrl =
      options.otelLogsExporterUrl ??
      (process.env.OTEL_EXPORTER_OTLP_ENDPOINT
        ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`
        : "http://localhost:4318/v1/logs");

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
      "service.name": process.env.OTEL_SERVICE_NAME || "Satp-Hermes-Gateway",
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
          exportIntervalMillis: 100,
        }),
        instrumentations: [getNodeAutoInstrumentations()],
        views: [
          new View({
            instrumentType: InstrumentType.HISTOGRAM,
            aggregation: new ExplicitBucketHistogramAggregation([
              10, 50, 100, 500, 1000, 5000, 10000, 60000,
            ]),
          }),
        ],
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

      this.createCounter("gateways", "Total number of gateways connected", "updown");
      this.createCounter(
        "created_sessions",
        "Total number of sessions created",
      );
      this.createCounter(
        "total_value_exchanged",
        "Total token value exchanged",
      );
      this.createCounter(
        "initiated_transactions",
        "Total number of initiated transactions",
      );
      this.createCounter(
        "successful_transactions",
        "Total number of successful transactions",
      );
      this.createCounter(
        "ongoing_transactions",
        "Total number of ongoing transactions",
        "updown",
      );
      this.createCounter(
        "failed_transactions",
        "Total number of failed transactions",
      );
      this.createHistogram(
        "operation_duration",
        "Operation duration in milliseconds",
        "ms",
      );
      this.createCounter(
        "transaction_duration",
        "Transaction duration in milliseconds",
        "updown"
      );
      this.createCounter("transaction_gas_used", "Transaction gas used", "updown");
      this.createCounter("operation_gas_used", "Operation gas used", "updown");
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
   * @param type - The type of metric to create ("counter" or "updown", default is "counter").
   * @throws {UninitializedMonitorServiceError} If the NodeSDK is not initialized.
   * @returns {Promise<void>} A promise that resolves when the metric is created.
   */
  public async createCounter(
    metricName: string,
    description: string = "",
    type: "counter" | "updown" = "counter",
  ): Promise<void> {
    const fnTag = `${this.label}#createCounter()`;
    if (!this.isEnabled) return;
    if (!this.sdk) {
      throw new UninitializedMonitorServiceError(
        `${fnTag} - NodeSDK not initialized`,
      );
    }

    const meter = metrics.getMeterProvider().getMeter("satp-hermes-meter");

    if (!counters.has(metricName)) {
      if (type === "counter") {
        const counter = meter.createCounter(metricName, {
          description: description,
        });
        counters.set(metricName, { type: "counter", metric: counter });
      } else if (type === "updown") {
        const upDownCounter = meter.createUpDownCounter(metricName, {
          description: description,
        });
        counters.set(metricName, { type: "updown", metric: upDownCounter });
      }
      this.logger.debug(`${fnTag} - Created ${type} metric: ${metricName}`);
      this.createLog("debug", `${fnTag} - Created ${type} metric: ${metricName}`);
    } else {
      this.logger.warn(
        `${fnTag} - Metric ${metricName} already exists. Skipping creation.`,
      );
      this.createLog("warn", `${fnTag} - Metric ${metricName} already exists.`);
    }
  }

  /**
   * Creates a histogram with the given name and description.
   *
   * @param metricName - The name of the histogram to create.
   * @param description - A description of the histogram.
   * @param unit - The unit of measurement for the histogram (default is "ms").
   * @throws {UninitializedMonitorServiceError} If the NodeSDK is not initialized.
   * @returns {Promise<void>} A promise that resolves when the histogram is created.
   */
  public async createHistogram(
    metricName: string,
    description: string = "",
    unit: string = "ms",
  ): Promise<void> {
    const fnTag = `${this.label}#createHistogram()`;
    if (!this.isEnabled) return;
    if (!this.sdk) {
      throw new UninitializedMonitorServiceError(
        `${fnTag} - NodeSDK not initialized`,
      );
    }

    const meter = metrics.getMeterProvider().getMeter("satp-hermes-meter");

    if (!histograms.has(metricName)) {
      const histogram = meter.createHistogram(metricName, {
        description,
        unit,
        valueType: 1,
      });
      histograms.set(metricName, histogram);
      this.logger.debug(`${fnTag} - Created histogram: ${metricName}`);
      this.createLog("debug", `${fnTag} - Created histogram: ${metricName}`);
    } else {
      this.logger.warn(
        `${fnTag} - Histogram ${metricName} already exists. Skipping creation.`,
      );
      this.createLog(
        "warn",
        `${fnTag} - Histogram ${metricName} already exists.`,
      );
    }
  }

  /**
   * Creates a gauge with the given name and description.
   *
   * @param metricName - The name of the gauge to create.
   * @param callback - A function that returns the current value of the gauge.
   * @param description - A description of the gauge.
   * @throws {UninitializedMonitorServiceError} If the NodeSDK is not initialized.
   * @returns {Promise<void>} A promise that resolves when the gauge is created.
   */
  public async createGauge(
    metricName: string,
    callback: () => number,
    description: string = "",
  ): Promise<void> {
    const fnTag = `${this.label}#createGauge()`;
    if (!this.isEnabled) return;
    if (!this.sdk) {
      throw new UninitializedMonitorServiceError(
        `${fnTag} - NodeSDK not initialized`,
      );
    }

    const meter = metrics.getMeterProvider().getMeter("satp-hermes-meter");

    if (!gauges.has(metricName)) {
      meter
        .createObservableGauge(metricName, {
          description,
        })
        .addCallback((observableResult: ObservableResult) => {
          const value = callback();
          observableResult.observe(value);
        });

      gauges.set(metricName, callback);
      this.logger.debug(`${fnTag} - Created gauge: ${metricName}`);
      this.createLog("debug", `${fnTag} - Created gauge: ${metricName}`);
    } else {
      this.logger.warn(
        `${fnTag} - Gauge ${metricName} already exists. Skipping creation.`,
      );
      this.createLog("warn", `${fnTag} - Gauge ${metricName} already exists.`);
    }
  }

  /**
   * Increments the counter for the given metric by the specified amount.
   *
   * @param metricName - The name of the metric to increment.
   * @param amount - The amount to increment the counter by (default is 1).
   * @param attributes - The attributes to attach to the metric (default is an empty object).
   * @param ctx - The context in which to increment the counter (default is the current context).
   * @throws {UninitializedMonitorServiceError} If the NodeSDK is not initialized.
   * @throws {Error} If the counter for the given metric does not exist.
   * @throws {Error} If the amount to increment is less than 1.
   * @returns {Promise<void>} A promise that resolves when the counter is incremented.
   */
  public async updateCounter(
    metricName: string,
    amount: number = 1,
    attributes: Record<
      string,
      undefined | string | number | boolean | string[] | number[] | boolean[]
    > = {},
    ctx: Context = context.active(),
  ): Promise<void> {
    const fnTag = `${this.label}#updateCounter()`;
    if (!this.isEnabled) return;
    if (!this.sdk) {
      throw new UninitializedMonitorServiceError(
        `${fnTag} - NodeSDK not initialized`,
      );
    }
    const counter = counters.get(metricName);
    if (!counter) {
      throw new Error(
        `${fnTag} - Counter ${metricName} not found. Did you call createCounter()?`,
      );
    }
    if (counter.type === "counter" && amount < 1) {
      throw new Error(`${fnTag} - Amount must be a positive number for Counter.`);
    }

    counter.metric.add(amount, attributes, ctx);
    this.logger.debug(
      `${fnTag} - Incremented counter: ${metricName} by ${amount} with attributes ${JSON.stringify(attributes)}`,
    );
    this.createLog(
      "debug",
      `${fnTag} - Incremented counter: ${metricName} by ${amount} with attributes ${JSON.stringify(attributes)}`,
    );
  }

  /**
   * Records a value in the histogram for the given metric.
   *
   * @param metricName - The name of the histogram to record the value in.
   * @param value - The value to record.
   * @param attributes - The attributes to attach to the metric (default is an empty object).
   * @param ctx - The context in which to record the value (default is the current context).
   * @throws {UninitializedMonitorServiceError} If the NodeSDK is not initialized.
   * @returns {Promise<void>} A promise that resolves when the value is recorded.
   */
  public async recordHistogram(
    metricName: string,
    value: number,
    attributes: Record<
      string,
      undefined | string | number | boolean | string[] | number[] | boolean[]
    > = {},
    ctx: Context = context.active(),
  ): Promise<void> {
    const fnTag = `${this.label}#recordHistogram()`;
    if (!this.isEnabled) return;
    if (!this.sdk) {
      throw new UninitializedMonitorServiceError(
        `${fnTag} - NodeSDK not initialized`,
      );
    }
    const histogram = histograms.get(metricName);
    if (!histogram) {
      throw new Error(
        `${fnTag} - Histogram ${metricName} not found. Did you call createHistogram()?`,
      );
    }
    histogram.record(value, attributes, ctx);
    this.logger.debug(
      `${fnTag} - Recorded value ${value} in histogram ${metricName} with attributes ${JSON.stringify(attributes)}`,
    );
    this.createLog(
      "debug",
      `${fnTag} - Recorded value ${value} in histogram ${metricName} with attributes ${JSON.stringify(attributes)}`,
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
    tracerName: string = "satp-hermes-tracer",
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
      context: context.active(),
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
