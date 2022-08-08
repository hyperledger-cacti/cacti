import promClient, { Registry } from "prom-client";
import { Calls } from "./response.type";
import { totalTxCount, K_CACTUS_UBIQUITY_TOTAL_METHOD_CALLS } from "./metrics";

export interface IPrometheusExporterOptions {
  pollingIntervalInMin?: number;
}

export class PrometheusExporter {
  public readonly metricsPollingIntervalInMin: number;
  public readonly calls: Calls = { counter: 0 };
  public readonly registry: Registry;

  constructor(
    public readonly prometheusExporterOptions: IPrometheusExporterOptions,
  ) {
    this.metricsPollingIntervalInMin =
      prometheusExporterOptions.pollingIntervalInMin || 1;
    this.registry = new Registry();
  }

  public addMethodCall(): void {
    this.calls.counter++;
    totalTxCount
      .labels(K_CACTUS_UBIQUITY_TOTAL_METHOD_CALLS)
      .set(this.calls.counter);
  }

  public async getPrometheusMetrics(): Promise<string> {
    const result = await this.registry.getSingleMetricAsString(
      K_CACTUS_UBIQUITY_TOTAL_METHOD_CALLS,
    );
    return result;
  }

  public startMetricsCollection(): void {
    this.registry.registerMetric(totalTxCount);
    promClient.collectDefaultMetrics({ register: this.registry });
  }
}
