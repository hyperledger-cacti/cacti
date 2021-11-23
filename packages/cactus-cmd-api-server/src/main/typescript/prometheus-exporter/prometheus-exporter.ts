import promClient, { Registry } from "prom-client";
import { TotalPluginImports } from "./response.type";
import { K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS } from "./metrics";
import { totalTxCount } from "./metrics";
import { collectMetrics } from "./data-fetcher";

export interface IPrometheusExporterOptions {
  pollingIntervalInMin?: number;
}

export class PrometheusExporter {
  public readonly metricsPollingIntervalInMin: number;
  public readonly totalPluginImports: TotalPluginImports = { counter: 0 };
  public readonly registry: Registry;

  constructor(
    public readonly prometheusExporterOptions: IPrometheusExporterOptions,
  ) {
    this.metricsPollingIntervalInMin =
      prometheusExporterOptions.pollingIntervalInMin || 1;
    this.registry = new Registry();
  }

  public setTotalPluginImports(totalPluginImports: number): void {
    this.totalPluginImports.counter = totalPluginImports;
    collectMetrics(this.totalPluginImports);
  }

  public async getPrometheusMetrics(): Promise<string> {
    const result = await this.registry.getSingleMetricAsString(
      K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS,
    );
    return result;
  }

  public startMetricsCollection(): void {
    this.registry.registerMetric(totalTxCount);
    promClient.collectDefaultMetrics({ register: this.registry });
  }
}
