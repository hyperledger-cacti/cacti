import promClient from "prom-client";
import { TotalPluginImports } from "./response.type";
import { K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS } from "./metrics";
import { collectMetrics } from "./data-fetcher";

export interface IPrometheusExporterOptions {
  pollingIntervalInMin?: number;
}

export class PrometheusExporter {
  public readonly metricsPollingIntervalInMin: number;
  public readonly totalPluginImports: TotalPluginImports = { counter: 0 };

  constructor(
    public readonly prometheusExporterOptions: IPrometheusExporterOptions,
  ) {
    this.metricsPollingIntervalInMin =
      prometheusExporterOptions.pollingIntervalInMin || 1;
  }

  public setTotalPluginImports(totalPluginImports: number): void {
    this.totalPluginImports.counter = totalPluginImports;
    collectMetrics(this.totalPluginImports);
  }

  public async getPrometheusMetrics(): Promise<string> {
    const result = await promClient.register.getSingleMetricAsString(
      K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS,
    );
    return result;
  }

  public startMetricsCollection(): void {
    const Registry = promClient.Registry;
    const register = new Registry();
    promClient.collectDefaultMetrics({ register });
  }
}
