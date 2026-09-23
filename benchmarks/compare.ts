#!/usr/bin/env ts-node

import { readFileSync } from 'fs';

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

interface BenchmarkFile {
  timestamp: string;
  results: BenchmarkResult[];
  summary: {
    totalBenchmarks: number;
    totalTime: number;
  };
}

function compareBenchmarks(file1: string, file2: string): void {
  try {
    const benchmark1: BenchmarkFile = JSON.parse(readFileSync(file1, 'utf-8'));
    const benchmark2: BenchmarkFile = JSON.parse(readFileSync(file2, 'utf-8'));

    console.log('\n' + '='.repeat(80));
    console.log('BENCHMARK COMPARISON');
    console.log('='.repeat(80));
    console.log(`\nFile 1: ${file1} (${benchmark1.timestamp})`);
    console.log(`File 2: ${file2} (${benchmark2.timestamp})`);
    console.log('');

    // Compare each benchmark
    benchmark1.results.forEach((result1) => {
      const result2 = benchmark2.results.find((r) => r.name === result1.name);

      if (result2) {
        const avgDiff = ((result2.avgTime - result1.avgTime) / result1.avgTime) * 100;
        const opsDiff = ((result2.opsPerSecond - result1.opsPerSecond) / result1.opsPerSecond) * 100;

        let status = '➡️  SAME';
        if (avgDiff > 10) status = '🔴 REGRESSION';
        else if (avgDiff < -10) status = '🟢 IMPROVEMENT';

        console.log(`${result1.name}:`);
        console.log(`  File 1: ${result1.avgTime.toFixed(4)}ms (${result1.opsPerSecond.toFixed(0)} ops/sec)`);
        console.log(`  File 2: ${result2.avgTime.toFixed(4)}ms (${result2.opsPerSecond.toFixed(0)} ops/sec)`);
        console.log(`  Time Diff: ${avgDiff > 0 ? '+' : ''}${avgDiff.toFixed(2)}%`);
        console.log(`  Ops Diff: ${opsDiff > 0 ? '+' : ''}${opsDiff.toFixed(2)}%`);
        console.log(`  Status: ${status}`);
        console.log('');
      } else {
        console.log(`${result1.name}: ⚠️  NOT FOUND in File 2\n`);
      }
    });

    // Overall summary
    const totalDiff =
      ((benchmark2.summary.totalTime - benchmark1.summary.totalTime) /
        benchmark1.summary.totalTime) *
      100;

    console.log('='.repeat(80));
    console.log('OVERALL SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Time (File 1): ${benchmark1.summary.totalTime.toFixed(2)}ms`);
    console.log(`Total Time (File 2): ${benchmark2.summary.totalTime.toFixed(2)}ms`);
    console.log(`Difference: ${totalDiff > 0 ? '+' : ''}${totalDiff.toFixed(2)}%`);
    console.log('='.repeat(80) + '\n');
  } catch (error: any) {
    console.error('Error comparing benchmarks:', error.message);
    process.exit(1);
  }
}

// CLI
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log('Usage: ts-node compare.ts <file1.json> <file2.json>');
  console.log('Example: ts-node compare.ts baseline.json results.json');
  process.exit(1);
}

compareBenchmarks(args[0], args[1]);
