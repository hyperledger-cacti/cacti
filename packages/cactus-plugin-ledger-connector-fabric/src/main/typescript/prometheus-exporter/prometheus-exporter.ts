import promClient from "prom-client";
import { Transactions } from "./response.type";
import { totalTxCount, K_CACTUS_FABRIC_TOTAL_TX_COUNT } from "./metrics";

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
      K_CACTUS_FABRIC_TOTAL_TX_COUNT,
    );
    return result;
  }

  public startMetricsCollection(): void {
    const Registry = promClient.Registry;
    const register = new Registry();
    promClient.collectDefaultMetrics({ register });
  }
}
