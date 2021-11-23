import promClient, { Registry } from "prom-client";
import { KeyCount } from "./response.type";
import { collectMetrics } from "./data-fetcher";
import { K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT } from "./metrics";
import { totalKeyCount } from "./metrics";

export interface IPrometheusExporterOptions {
  pollingIntervalInMin?: number;
}

export class PrometheusExporter {
  public readonly metricsPollingIntervalInMin: number;
  public readonly keyCount: KeyCount = { counter: 0 };
  public readonly registry: Registry;

  constructor(
    public readonly prometheusExporterOptions: IPrometheusExporterOptions,
  ) {
    this.metricsPollingIntervalInMin =
      prometheusExporterOptions.pollingIntervalInMin || 1;
    this.registry = new Registry();
  }

  public setTotalKeyCounter(keyCount: number): void {
    this.keyCount.counter = keyCount;
    collectMetrics(this.keyCount);
  }

  public async getPrometheusMetrics(): Promise<string> {
    const result = await this.registry.getSingleMetricAsString(
      K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT,
    );
    return result;
  }

  public startMetricsCollection(): void {
    this.registry.registerMetric(totalKeyCount);
    promClient.collectDefaultMetrics({ register: this.registry });
  }
}
