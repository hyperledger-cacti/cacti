import { performance } from 'perf_hooks';

export interface PerformanceMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  totalDuration: number;
  latencies: number[];
  avgLatency: number;
  throughput: number;
  successRate: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    totalTransactions: 0,
    successfulTransactions: 0,
    totalDuration: 0,
    latencies: [],
    avgLatency: 0,
    throughput: 0,
    successRate: 0
  };

  startTransaction(): number {
    this.metrics.totalTransactions++;
    return performance.now();
  }

  endTransaction(startTime: number, success: boolean = true): number {
    const endTime = performance.now();
    const latency = endTime - startTime;
    
    if (success) {
      this.metrics.successfulTransactions++;
      this.metrics.latencies.push(latency);
      this.metrics.totalDuration += latency;
    }
    
    return latency;
  }

  getResults(): PerformanceMetrics {
    const result = {...this.metrics};
    
    // Calculate derived metrics
    result.avgLatency = result.successfulTransactions > 0 ? 
      result.totalDuration / result.successfulTransactions : 0;
      
    result.throughput = result.totalDuration > 0 ?
      (result.successfulTransactions / result.totalDuration) * 1000 : 0;
      
    result.successRate = result.totalTransactions > 0 ?
      (result.successfulTransactions / result.totalTransactions) * 100 : 0;
      
    return result;
  }

  reset(): void {
    this.metrics = {
      totalTransactions: 0,
      successfulTransactions: 0,
      totalDuration: 0,
      latencies: [],
      avgLatency: 0,
      throughput: 0,
      successRate: 0
    };
  }
}