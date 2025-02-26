import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  SimpleSpanProcessor,
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common"; 
import { IMonitorEntity, IMonitorRepository } from "./monitor-repository";
import { Context, context, trace, Span } from "@opentelemetry/api";

export interface MonitorServiceOptions {
  repo: IMonitorRepository;
  otelMetricsExporterUrl?: string;
}

export class MonitorService {
  public readonly label = "MonitorService";
  private readonly logger: Logger;
  private meterProvider: MeterProvider | undefined;
  private tracerProvider: NodeTracerProvider | undefined;
  private readonly otelMetricsExporterUrl: string;

  private static instance: MonitorService | undefined;

  public static createOrGetMonitorService(options: MonitorServiceOptions): MonitorService {
    if (!MonitorService.instance) {
      MonitorService.instance = new MonitorService(options);
    }
    return MonitorService.instance;
  }

  private constructor(options: MonitorServiceOptions) {
    this.repo = options.repo;
    this.otelMetricsExporterUrl = options.otelMetricsExporterUrl || "http://otel-collector:4318/v1/metrics";
    this.logger = LoggerProvider.getOrCreate({ level: "INFO", label: this.label });
  }

  private readonly repo: IMonitorRepository;

  public async init(): Promise<void> {
    this.logger.info("Initializing MonitorService...");
    await this.repo.reset(); // resets storage
    this.logger.info("Initialization complete");
  }

  /**
   * Sets up monitoring to capture stdout and stderr and send to OpenTelemetry
   */
  public exportLogs(): void {
    if (!this.tracerProvider) {
      this.tracerProvider = new NodeTracerProvider({
        spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())]
      });
      this.tracerProvider.register();
    }
    
    const tracer = this.tracerProvider.getTracer("satp-hermes-tracer");
    const repository = this.repo;
    
    // Capture stdout
    const originalStdOutWrite = process.stdout.write;
    process.stdout.write = function(
      chunk: string | Uint8Array,
      encodingOrCallback?: string | ((err?: Error) => void),
      callback?: (err?: Error) => void
    ): boolean {
      const message = chunk.toString();

      const event: IMonitorEntity = {
        id: `${Date.now()}-log`,
        eventType: "log",
        timestamp: Date.now(),
        payload: { source: "stdout", message },
      };
      void repository.create(event);
      return originalStdOutWrite.apply(process.stdout, [chunk, encodingOrCallback as any, callback]);
    };

    // Capture stderr
    const originalStderrWrite = process.stderr.write;
    process.stderr.write = function(
      chunk: string | Uint8Array,
      encodingOrCallback?: string | ((err?: Error) => void),
      callback?: (err?: Error) => void
    ): boolean {
      const message = chunk.toString();
      const event: IMonitorEntity = {
        id: `${Date.now()}-err`,
        eventType: "log",
        timestamp: Date.now(),
        payload: { source: "stderr", message },
      };
      void repository.create(event);
      return originalStderrWrite.apply(process.stderr, [chunk, encodingOrCallback as any, callback]);
    };
    
    this.logger.info("Stdout and stderr capture enabled for OpenTelemetry");
  }
  /**
   * Creates a new counter metric if not already created.
   */
  public async createMetric(metricName: string): Promise<void> {
    if (!this.meterProvider) {
      this.meterProvider = new MeterProvider();
    }
    const meter = this.meterProvider.getMeter("satp-hermes-meter");
    meter.createCounter(metricName);
    const event: IMonitorEntity = {
      id: `${Date.now()}-createMetric`,
      eventType: "metric",
      timestamp: Date.now(),
      payload: { info: `Metric [${metricName}] created` },
    };
    this.logger.debug(`Created metric: ${metricName}`);
    await this.repo.create(event);
  }

  /**
   * Increments an existing counter by the specified amount.
   */
  public async incrementMetric(metricName: string, amount = 1): Promise<void> {
    if (!this.meterProvider) {
      this.meterProvider = new MeterProvider();
    }
    const meter = this.meterProvider.getMeter("satp-hermes-meter");
    const counter = meter.createCounter(metricName);
    counter.add(amount);
  }

  public generateTraceID(tracerName = "satp-hermes-tracer", spanName = "generateTraceID"): string {
    if (!this.tracerProvider) {
      this.tracerProvider = new NodeTracerProvider({
        spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())]
      });
      this.tracerProvider.register();
    }
    const tracer = this.tracerProvider.getTracer(tracerName);
    const span = tracer.startSpan(spanName);
    const traceId = span.spanContext().traceId;
    span.end();
    return traceId;
  }

public startSpan(
  tracerName = "satp-hermes-tracer",
  spanName = "generateSpanID",
  ctx: Context = context.active(),
): Span {
  if (!this.tracerProvider) {
    this.tracerProvider = new NodeTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
    });
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

  /**
   * Force-export metrics to the otel-collector (Grafana OTEL stack).
   */
  public async exportMetrics(): Promise<void> {
    const otlpMetricExporter = new OTLPMetricExporter({
      url: this.otelMetricsExporterUrl,
    });
    const metricReader = new PeriodicExportingMetricReader({
      exporter: otlpMetricExporter,
      exportIntervalMillis: 2000,
    });
    this.meterProvider = new MeterProvider({
      readers: [metricReader]
    });

    // Attempt a one-time flush to push metrics now.
    await metricReader.forceFlush();

    const event: IMonitorEntity = {
      id: `${Date.now()}-export`,
      eventType: "metric",
      timestamp: Date.now(),
      payload: { info: "Metrics exported" },
    };
    this.logger.debug("Metrics exported");
    await this.repo.create(event);
  }
}