import promClient, { Registry } from "prom-client";
import { K_CACTI_SOLANA_TOTAL_TX_COUNT, totalTxCount } from "./metrics";

export interface IPrometheusExporterOptions {
  pollingIntervalInMin?: number;
}

export class PrometheusExporter {
  public readonly metricsPollingIntervalInMin: number;
  public txCount = 0;
  public readonly registry: Registry;

  constructor(
    public readonly prometheusExporterOptions: IPrometheusExporterOptions,
  ) {
    this.metricsPollingIntervalInMin =
      prometheusExporterOptions.pollingIntervalInMin || 1;
    this.registry = new Registry();
  }

  public recordTransaction(): void {
    this.txCount++;
    totalTxCount.inc({ type: "send" });
  }

  public async getPrometheusMetrics(): Promise<string> {
    return this.registry.getSingleMetricAsString(K_CACTI_SOLANA_TOTAL_TX_COUNT);
  }

  public startMetricsCollection(): void {
    this.registry.registerMetric(totalTxCount);
    promClient.collectDefaultMetrics({ register: this.registry });
  }
}
