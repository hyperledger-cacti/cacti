import promClient, { Registry } from "prom-client";
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
  public readonly registry: Registry;

  constructor(
    public readonly prometheusExporterOptions: IPrometheusExporterOptions,
  ) {
    this.metricsPollingIntervalInMin =
      prometheusExporterOptions.pollingIntervalInMin || 1;
    this.registry = new Registry();
  }

  public setNodeCount(nodeCount: number): void {
    this.nodeCount.counter = nodeCount;
    totalTxCount
      .labels(K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT)
      .set(this.nodeCount.counter);
  }

  public async getPrometheusMetrics(): Promise<string> {
    const result = await this.registry.getSingleMetricAsString(
      K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT,
    );
    return result;
  }

  public startMetricsCollection(): void {
    this.registry.registerMetric(totalTxCount);
    promClient.collectDefaultMetrics({ register: this.registry });
  }
}
