import promClient, { Registry } from "prom-client";
import { Transactions } from "./response.type.js";
import { collectMetrics } from "./data.fetcher.js";
import { K_CACTUS_QUORUM_TOTAL_TX_COUNT } from "./metrics.js";
import { totalTxCount } from "./metrics.js";

export interface IPrometheusExporterOptions {
  pollingIntervalInMin?: number;
}

export class PrometheusExporter {
  public readonly metricsPollingIntervalInMin: number;
  public readonly transactions: Transactions = { counter: 0 };
  public readonly registry: Registry;

  constructor(
    public readonly prometheusExporterOptions: IPrometheusExporterOptions,
  ) {
    this.metricsPollingIntervalInMin =
      prometheusExporterOptions.pollingIntervalInMin || 1;
    this.registry = new Registry();
  }

  public addCurrentTransaction(): void {
    collectMetrics(this.transactions);
  }

  public async getPrometheusMetrics(): Promise<string> {
    const result = await this.registry.getSingleMetricAsString(
      K_CACTUS_QUORUM_TOTAL_TX_COUNT,
    );
    return result;
  }

  public startMetricsCollection(): void {
    this.registry.registerMetric(totalTxCount);
    promClient.collectDefaultMetrics({ register: this.registry });
  }
}
