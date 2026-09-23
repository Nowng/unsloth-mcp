/**
 * Tests for the MetricsCollector.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { MetricsCollector } from '../src/core/utils/metrics.js';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  it('should track zero metrics initially', () => {
    const stats = collector.getStats();
    expect(stats.totalCalls).toBe(0);
    expect(stats.successfulCalls).toBe(0);
    expect(stats.failedCalls).toBe(0);
    expect(stats.successRate).toBe(0);
  });

  it('should count successful and failed calls', () => {
    const start = Date.now();
    collector.endTool('load_model', start, true);
    collector.endTool('finetune_model', start, false, 'boom');
    collector.endTool('generate_text', start, true);

    const stats = collector.getStats();
    expect(stats.totalCalls).toBe(3);
    expect(stats.successfulCalls).toBe(2);
    expect(stats.failedCalls).toBe(1);
    expect(stats.successRate).toBeCloseTo(66.67, 1);
  });

  it('should record error messages on failure', () => {
    const start = Date.now();
    collector.endTool('load_model', start, false, 'CUDA out of memory');
    expect(collector['metrics'][0].errorMessage).toBe('CUDA out of memory');
  });

  it('should reset metrics', () => {
    const start = Date.now();
    collector.endTool('load_model', start, true);
    collector.reset();
    expect(collector.getStats().totalCalls).toBe(0);
  });

  it('should cap stored metrics at 1000 entries', () => {
    const start = Date.now();
    for (let i = 0; i < 1500; i++) {
      collector.endTool(`tool_${i}`, start, true);
    }
    expect(collector['metrics'].length).toBe(1000);
  });

  it('should compute duration statistics', async () => {
    jest.useFakeTimers();
    const start = Date.now();
    collector.endTool('a', start, true);
    await jest.advanceTimersByTimeAsync(100);
    collector.endTool('b', start, true);

    const stats = collector.getStats();
    expect(stats.minDuration).toBeGreaterThanOrEqual(0);
    expect(stats.maxDuration).toBeLessThanOrEqual(100);
    expect(stats.averageDuration).toBeGreaterThanOrEqual(0);
    jest.useRealTimers();
  });
});
