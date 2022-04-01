import promClient, { Registry } from "prom-client";
import { AwsSmKeys } from "./response.type";
import { collectMetrics } from "./data-fetcher";
import { K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT } from "./metrics";
import { totalKeyCount } from "./metrics";

export interface IPrometheusExporterOptions {
  pollingIntervalInMin?: number;
}

export class PrometheusExporter {
  public readonly metricsPollingIntervalInMin: number;
  public readonly awsSmKeys: AwsSmKeys = new Map();
  public readonly registry: Registry;

  constructor(
    public readonly prometheusExporterOptions: IPrometheusExporterOptions,
  ) {
    this.metricsPollingIntervalInMin =
      prometheusExporterOptions.pollingIntervalInMin || 1;
    this.registry = new Registry();
  }

  public setTotalKeyCounter(key: string, operation: string): void {
    if (operation === "set") {
      this.awsSmKeys.set(key, "keychain-awssm");
    } else {
      this.awsSmKeys.delete(key);
    }
    collectMetrics(this.awsSmKeys);
  }

  public async getPrometheusMetrics(): Promise<string> {
    const result = await this.registry.getSingleMetricAsString(
      K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT,
    );
    return result;
  }

  public startMetricsCollection(): void {
    this.registry.registerMetric(totalKeyCount);
    promClient.collectDefaultMetrics({ register: this.registry });
  }
}
