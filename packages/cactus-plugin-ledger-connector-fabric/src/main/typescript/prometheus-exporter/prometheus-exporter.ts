import promClient from "prom-client";
import { Transactions } from "./response.type";
import { totalTxCount } from "./metrics";

export const K_CACTUS_FABRIC_TOTAL_TX_COUNT = "cactus_fabric_total_tx_count";

export interface IPrometheusExporterOptions {
  pollingIntervalInMin?: number;
}

export class PrometheusExporter {
  public readonly metricsPollingIntervalInMin: number;
  public readonly transactions: Transactions = { counter: 0 };

  constructor(
    public readonly prometheusExporterOptions: IPrometheusExporterOptions,
  ) {
    this.metricsPollingIntervalInMin =
      prometheusExporterOptions.pollingIntervalInMin || 1;
  }

  public addCurrentTransaction(): void {
    this.transactions.counter++;
    totalTxCount
      .labels(K_CACTUS_FABRIC_TOTAL_TX_COUNT)
      .set(this.transactions.counter);
  }

  public async getPrometheusMetrics(): Promise<string> {
    const result = await promClient.register.getSingleMetricAsString(
      "cactus_fabric_total_tx_count",
    );
    return result;
  }

  public startMetricsCollection(): void {
    promClient.collectDefaultMetrics();
  }
}
