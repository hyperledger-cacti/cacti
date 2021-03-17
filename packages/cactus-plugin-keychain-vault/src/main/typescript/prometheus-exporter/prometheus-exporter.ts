import promClient from "prom-client";
import { VaultKeys } from "./response.type";
import { collectMetrics } from "./data-fetcher";
import { K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT } from "./metrics";

export interface IPrometheusExporterOptions {
  pollingIntervalInMin?: number;
}

export class PrometheusExporter {
  public readonly metricsPollingIntervalInMin: number;
  public readonly vaultKeys: VaultKeys = new Map();

  constructor(
    public readonly prometheusExporterOptions: IPrometheusExporterOptions,
  ) {
    this.metricsPollingIntervalInMin =
      prometheusExporterOptions.pollingIntervalInMin || 1;
  }

  public setTotalKeyCounter(key: string, operation: string): void {
    if (operation === "set") {
      this.vaultKeys.set(key, "keychain-vault");
    } else {
      this.vaultKeys.delete(key);
    }
    collectMetrics(this.vaultKeys);
  }

  public async getPrometheusMetrics(): Promise<string> {
    const result = await promClient.register.getSingleMetricAsString(
      K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT,
    );
    return result;
  }

  public startMetricsCollection(): void {
    const Registry = promClient.Registry;
    const register = new Registry();
    promClient.collectDefaultMetrics({ register });
  }
}
