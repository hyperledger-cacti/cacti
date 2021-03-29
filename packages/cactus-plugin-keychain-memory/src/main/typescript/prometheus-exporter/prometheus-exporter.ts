import promClient from "prom-client";
import { KeyCount } from "./response.type";
import { collectMetrics } from "./data-fetcher";
import { K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT } from "./metrics";
export interface IPrometheusExporterOptions {
  pollingIntervalInMin?: number;
}

export class PrometheusExporter {
  public readonly metricsPollingIntervalInMin: number;
  public readonly keyCount: KeyCount = { counter: 0 };

  constructor(
    public readonly prometheusExporterOptions: IPrometheusExporterOptions,
  ) {
    this.metricsPollingIntervalInMin =
      prometheusExporterOptions.pollingIntervalInMin || 1;
  }

  public setTotalKeyCounter(keyCount: number): void {
    this.keyCount.counter = keyCount;
    collectMetrics(this.keyCount);
  }

  public async getPrometheusMetrics(): Promise<string> {
    const result = await promClient.register.getSingleMetricAsString(
      K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT,
    );
    return result;
  }

  public startMetricsCollection(): void {
    const Registry = promClient.Registry;
    const register = new Registry();
    promClient.collectDefaultMetrics({ register });
  }
}
