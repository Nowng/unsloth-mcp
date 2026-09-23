#!/usr/bin/env ts-node

import { performance } from 'perf_hooks';
import { writeFileSync } from 'fs';
import { validateToolInputs } from '../src/utils/validation.js';
import { cache } from '../src/utils/cache.js';
import { config } from '../src/utils/config.js';
import { metricsCollector } from '../src/utils/metrics.js';

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

class BenchmarkSuite {
  private results: BenchmarkResult[] = [];

  /**
   * Run a benchmark
   */
  async benchmark(
    name: string,
    fn: () => void | Promise<void>,
    iterations: number = 1000
  ): Promise<BenchmarkResult> {
    const times: number[] = [];

    // Warmup
    for (let i = 0; i < Math.min(100, iterations / 10); i++) {
      await fn();
    }

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const opsPerSecond = 1000 / avgTime;

    const result: BenchmarkResult = {
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      opsPerSecond,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Print results
   */
  printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('PERFORMANCE BENCHMARK RESULTS');
    console.log('='.repeat(80) + '\n');

    this.results.forEach((result) => {
      console.log(`${result.name}:`);
      console.log(`  Iterations: ${result.iterations}`);
      console.log(`  Total Time: ${result.totalTime.toFixed(2)}ms`);
      console.log(`  Average: ${result.avgTime.toFixed(4)}ms`);
      console.log(`  Min: ${result.minTime.toFixed(4)}ms`);
      console.log(`  Max: ${result.maxTime.toFixed(4)}ms`);
      console.log(`  Ops/sec: ${result.opsPerSecond.toFixed(0)}`);
      console.log('');
    });

    console.log('='.repeat(80) + '\n');
  }

  /**
   * Save results to JSON
   */
  saveResults(filename: string): void {
    const output = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalBenchmarks: this.results.length,
        totalTime: this.results.reduce((a, b) => a + b.totalTime, 0),
      },
    };

    writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`Results saved to: ${filename}`);
  }

  /**
   * Compare with baseline
   */
  compareWithBaseline(baselineFile: string): void {
    try {
      const baseline = JSON.parse(require('fs').readFileSync(baselineFile, 'utf-8'));

      console.log('\n' + '='.repeat(80));
      console.log('COMPARISON WITH BASELINE');
      console.log('='.repeat(80) + '\n');

      this.results.forEach((current) => {
        const base = baseline.results.find((r: BenchmarkResult) => r.name === current.name);

        if (base) {
          const diff = ((current.avgTime - base.avgTime) / base.avgTime) * 100;
          const diffStr = diff > 0 ? `+${diff.toFixed(2)}%` : `${diff.toFixed(2)}%`;
          const status = diff > 10 ? '⚠️  SLOWER' : diff < -10 ? '✅ FASTER' : '➡️  SAME';

          console.log(`${current.name}:`);
          console.log(`  Current: ${current.avgTime.toFixed(4)}ms`);
          console.log(`  Baseline: ${base.avgTime.toFixed(4)}ms`);
          console.log(`  Difference: ${diffStr} ${status}`);
          console.log('');
        }
      });

      console.log('='.repeat(80) + '\n');
    } catch (error) {
      console.log(`Could not load baseline file: ${baselineFile}`);
    }
  }
}

// Run benchmarks
async function runBenchmarks() {
  const suite = new BenchmarkSuite();

  console.log('Starting performance benchmarks...\n');

  // Benchmark 1: Validation
  await suite.benchmark(
    'Validation - check_installation',
    () => {
      validateToolInputs('check_installation', {});
    },
    10000
  );

  await suite.benchmark(
    'Validation - load_model',
    () => {
      validateToolInputs('load_model', {
        model_name: 'unsloth/Llama-3.2-1B-bnb-4bit',
        max_seq_length: 2048,
      });
    },
    10000
  );

  await suite.benchmark(
    'Validation - finetune_model',
    () => {
      validateToolInputs('finetune_model', {
        model_name: 'unsloth/Llama-3.2-1B-bnb-4bit',
        dataset_name: 'tatsu-lab/alpaca',
        output_dir: './output',
      });
    },
    10000
  );

  // Benchmark 2: Cache Operations
  await suite.benchmark(
    'Cache - set',
    () => {
      cache.set('test-key', { data: 'test-value' });
    },
    10000
  );

  await suite.benchmark(
    'Cache - get (hit)',
    () => {
      cache.get('test-key');
    },
    10000
  );

  await suite.benchmark(
    'Cache - get (miss)',
    () => {
      cache.get('non-existent-key');
    },
    10000
  );

  await suite.benchmark(
    'Cache - has',
    () => {
      cache.has('test-key');
    },
    10000
  );

  // Benchmark 3: Config Operations
  await suite.benchmark(
    'Config - get',
    () => {
      config.get();
    },
    10000
  );

  await suite.benchmark(
    'Config - getServer',
    () => {
      config.getServer();
    },
    10000
  );

  await suite.benchmark(
    'Config - getCache',
    () => {
      config.getCache();
    },
    10000
  );

  // Benchmark 4: Metrics Operations
  await suite.benchmark(
    'Metrics - endTool',
    () => {
      metricsCollector.endTool('test-tool', Date.now() - 100, true);
    },
    10000
  );

  await suite.benchmark(
    'Metrics - getStats',
    () => {
      metricsCollector.getStats();
    },
    10000
  );

  // Print and save results
  suite.printResults();
  suite.saveResults('benchmarks/results.json');

  // Compare with baseline if it exists
  suite.compareWithBaseline('benchmarks/baseline.json');
}

// Run if executed directly
if (require.main === module) {
  runBenchmarks()
    .then(() => {
      console.log('Benchmarks completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark error:', error);
      process.exit(1);
    });
}

export { BenchmarkSuite, BenchmarkResult };
