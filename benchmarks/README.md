# Performance Benchmarks

This directory contains performance benchmarks for the Unsloth MCP Server.

## Files

- `suite.ts` - Main benchmark suite
- `compare.ts` - Compare two benchmark results
- `baseline.json` - Baseline performance metrics
- `results.json` - Latest benchmark results (generated)

## Running Benchmarks

### Run All Benchmarks

```bash
npm run bench
```

This will:
1. Run all benchmarks (12 tests, 10,000 iterations each)
2. Print results to console
3. Save results to `benchmarks/results.json`
4. Compare with baseline

### Compare Two Results

```bash
npm run bench:compare benchmarks/baseline.json benchmarks/results.json
```

### Set New Baseline

```bash
npm run bench
cp benchmarks/results.json benchmarks/baseline.json
```

## Benchmark Coverage

### Validation (3 benchmarks)
- `check_installation` - Validate empty args
- `load_model` - Validate model loading params
- `finetune_model` - Validate fine-tuning params

### Cache Operations (4 benchmarks)
- `set` - Write to cache
- `get (hit)` - Read existing key
- `get (miss)` - Read non-existent key
- `has` - Check key existence

### Config Operations (3 benchmarks)
- `get` - Get full config
- `getServer` - Get server config
- `getCache` - Get cache config

### Metrics Operations (2 benchmarks)
- `endTool` - Record tool completion
- `getStats` - Get metrics statistics

## Interpreting Results

### Performance Metrics

- **Avg Time**: Average execution time per operation
- **Min/Max**: Fastest and slowest execution times
- **Ops/sec**: Operations per second (higher is better)

### Comparison Status

- 🟢 **IMPROVEMENT**: >10% faster than baseline
- ➡️  **SAME**: Within ±10% of baseline
- 🔴 **REGRESSION**: >10% slower than baseline

### Expected Performance

Baseline targets on modern hardware (Node.js 20, 2023+ CPU):

| Operation | Target | Ops/sec |
|-----------|--------|---------|
| Validation | <0.01ms | >100K |
| Cache Get | <0.01ms | >100K |
| Cache Set | <0.02ms | >50K |
| Config Get | <0.005ms | >200K |
| Metrics | <0.01ms | >100K |

## Adding New Benchmarks

Edit `suite.ts` and add your benchmark:

```typescript
await suite.benchmark(
  'Your Benchmark Name',
  () => {
    // Code to benchmark
    yourFunction();
  },
  10000 // iterations
);
```

## Continuous Integration

Benchmarks can be run in CI to detect performance regressions:

```yaml
# In .github/workflows/ci.yml
- name: Run Benchmarks
  run: npm run bench

- name: Compare with Baseline
  run: npm run bench:compare benchmarks/baseline.json benchmarks/results.json
```

## Best Practices

1. **Warmup**: Suite runs 100 warmup iterations before benchmarking
2. **Iterations**: 10,000 iterations for stable averages
3. **Baseline**: Update baseline after significant optimizations
4. **Regression**: Investigate any >10% performance regression
5. **Hardware**: Run on consistent hardware for comparisons

## Optimization Tips

If benchmarks show poor performance:

1. **Validation**: Cache validation schemas
2. **Cache**: Increase cache size or TTL
3. **Config**: Use getters instead of full config
4. **Metrics**: Batch metric updates
5. **Logging**: Reduce log level in production

## Troubleshooting

**Inconsistent Results**
- Run multiple times and average
- Check for background processes
- Ensure stable CPU temperature

**High Variance**
- Increase iterations
- Run on idle system
- Check for memory pressure

**Slower Than Baseline**
- Check Node.js version
- Verify optimization flags
- Review recent code changes
