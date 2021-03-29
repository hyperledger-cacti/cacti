import promClient from "prom-client";
import { NodeCount } from "./response.type";
import {
  totalTxCount,
  K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT,
} from "./metrics";

export interface IPrometheusExporterOptions {
  pollingIntervalInMin?: number;
}

export class PrometheusExporter {
  public readonly metricsPollingIntervalInMin: number;
  public readonly nodeCount: NodeCount = { counter: 0 };

  constructor(
    public readonly prometheusExporterOptions: IPrometheusExporterOptions,
  ) {
    this.metricsPollingIntervalInMin =
      prometheusExporterOptions.pollingIntervalInMin || 1;
  }

  public setNodeCount(nodeCount: number): void {
    this.nodeCount.counter = nodeCount;
    totalTxCount
      .labels(K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT)
      .set(this.nodeCount.counter);
  }

  public async getPrometheusMetrics(): Promise<string> {
    const result = await promClient.register.getSingleMetricAsString(
      K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT,
    );
    return result;
  }

  public startMetricsCollection(): void {
    const Registry = promClient.Registry;
    const register = new Registry();
    promClient.collectDefaultMetrics({ register });
  }
}
