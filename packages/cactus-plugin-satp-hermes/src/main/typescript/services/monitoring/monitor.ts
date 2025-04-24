import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  SimpleSpanProcessor,
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { Context, context, trace, Span } from "@opentelemetry/api";

export interface MonitorServiceOptions {
  logLevel?: LogLevelDesc;
  otelMetricsExporterUrl?: string;
}

export class MonitorService {
  public readonly label = "MonitorService";
  private readonly logger: Logger;
  private tracerProvider: NodeTracerProvider | undefined;
  private meterProvider: MeterProvider | undefined;
  private readonly otelMetricsExporterUrl: string;

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
  }

  public async init(): Promise<void> {
    this.logger.info("Initializing MonitorService...");
    if (!this.tracerProvider) {
      this.tracerProvider = new NodeTracerProvider();
      this.tracerProvider.addSpanProcessor(
        new SimpleSpanProcessor(new ConsoleSpanExporter()),
      );
      this.tracerProvider.register();
    }

    if (!this.meterProvider) {
      const metricReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: this.otelMetricsExporterUrl,
        }),
      });
      this.meterProvider = new MeterProvider({
        readers: [metricReader],
      });
    }
    this.logger.info("Initialization complete");
  }

  public async createMetric(metricName: string): Promise<void> {
    if (!this.meterProvider) {
      throw new Error("MeterProvider not initialized");
    }
    const meter = this.meterProvider.getMeter("satp-hermes-meter");
    meter.createCounter(metricName);
    this.logger.debug(`Created metric: ${metricName}`);
  }

  public async incrementCounter(metricName: string, amount = 1): Promise<void> {
    if (!this.meterProvider) {
      throw new Error("MeterProvider not initialized");
    }
    const meter = this.meterProvider.getMeter("satp-hermes-meter");
    const counter = meter.createCounter(metricName);
    counter.add(amount);
  }

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
}
