/**
 * Metrics Collector
 * 
 * Tracks tool execution metrics for observability.
 */

export interface ToolMetric {
  toolName: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  errorMessage?: string;
}

export class MetricsCollector {
  private metrics: ToolMetric[];

  constructor() {
    this.metrics = [];
  }

  startTool(_toolName: string): number {
    return Date.now();
  }

  endTool(
    toolName: string,
    startTime: number,
    success: boolean,
    errorMessage?: string
  ): void {
    this.metrics.push({
      toolName,
      startTime,
      endTime: Date.now(),
      success,
      errorMessage,
    });

    // Keep only last 1000 metrics to prevent unbounded memory growth
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
  }

  getStats(): {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    successRate: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
  } {
    const total = this.metrics.length;
    const successful = this.metrics.filter(m => m.success).length;
    const failed = total - successful;

    const durations = this.metrics
      .filter(m => m.startTime && m.endTime)
      .map(m => (m.endTime! - m.startTime)!);

    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    return {
      totalCalls: total,
      successfulCalls: successful,
      failedCalls: failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageDuration: Math.round(avgDuration),
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
    };
  }

  reset(): void {
    this.metrics = [];
  }
}

export const metricsCollector = new MetricsCollector();
