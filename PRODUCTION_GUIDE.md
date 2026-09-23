# Production Deployment Guide

## Overview

The Unsloth MCP Server v2.0+ includes production-grade features for reliability, security, and observability.

## Features

### 1. Comprehensive Logging

Winston-based structured logging with multiple transports:

```bash
# Log locations
logs/error.log      # Errors only
logs/combined.log   # All logs
stderr              # Console output in production
```

**Configuration**:
```bash
# Set log level (default: info)
export LOG_LEVEL=debug  # debug, info, warn, error

# In development: colorized console output
# In production: JSON logs to stderr
export NODE_ENV=production
```

### 2. Input Validation

All tool inputs are validated before execution:

- Model names (format, length)
- File paths (no directory traversal, restricted directories)
- Numeric ranges (batch size, iterations, etc.)
- Enum values (export formats, dataset formats)
- Text length limits

**Error responses include suggestions**:
```json
{
  "error": "Validation error: batch_size must be between 1 and 128",
  "suggestions": [
    "Current value: 256",
    "Try reducing to 128 or less"
  ]
}
```

### 3. Security Features

**Input Sanitization**:
- Python script sanitization
- Path traversal prevention
- Dangerous pattern detection

**Resource Limits**:
- Max execution time: 10 minutes (configurable)
- Max file size: 100MB
- Max concurrent operations: 3
- Max script length: 50,000 characters

**Rate Limiting**:
- Queues operations when limit reached
- Prevents resource exhaustion
- Exponential backoff on retries

### 4. Error Handling

Smart error detection with contextual suggestions:

**File not found:**
```
Suggestions:
1. Check that the file path is correct
2. Ensure the file exists before proceeding
3. Use absolute paths when possible
```

**Out of memory:**
```
Suggestions:
1. Try using 4-bit quantization (load_in_4bit=true)
2. Reduce batch size
3. Use a smaller model
4. Increase available RAM
```

**Timeout:**
```
Suggestions:
1. Try reducing the workload size
2. Consider processing in smaller batches
3. Check if Python dependencies are installed correctly
```

### 5. Performance Metrics

Track tool usage and performance:

```typescript
// Metrics tracked per tool:
- Total calls
- Successful/failed calls
- Average/min/max duration
- Error messages

// Accessible via metricsCollector API
const stats = metricsCollector.getStats('finetune_model');
// {
//   totalCalls: 10,
//   successfulCalls: 8,
//   failedCalls: 2,
//   averageDuration: 45000,
//   minDuration: 30000,
//   maxDuration: 60000
// }
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Watch mode
npm test:watch

# With coverage
npm test:coverage

# Lint/type check
npm run lint
```

### Test Coverage

```
src/utils/validation.ts  - 100% coverage
src/utils/security.ts    - High coverage
src/utils/metrics.ts     - 100% coverage
```

## Deployment

### Environment Variables

```bash
# Required
HUGGINGFACE_TOKEN=your_token_here

# Optional
LOG_LEVEL=info              # debug | info | warn | error
NODE_ENV=production         # Changes logging format
PYTHONPATH=/path/to/python  # Custom Python path
```

### Docker Deployment

```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install unsloth transformers datasets tokenizers

# Copy and build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Create logs directory
RUN mkdir -p /app/logs

# Run
CMD ["node", "build/index.js"]
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure appropriate `LOG_LEVEL`
- [ ] Set up log rotation (logs grow over time)
- [ ] Monitor disk space for logs
- [ ] Set up error alerting
- [ ] Configure backup for models/datasets
- [ ] Test with production data
- [ ] Load test with expected concurrency
- [ ] Set up monitoring/metrics dashboard

## Monitoring

### Log Analysis

```bash
# Monitor errors in real-time
tail -f logs/error.log

# Search for specific tool errors
grep "finetune_model" logs/combined.log | grep -i error

# Count errors by type
jq 'select(.level=="error") | .toolName' logs/combined.log | sort | uniq -c
```

### Metrics

Check metrics periodically:

```typescript
// In your monitoring script
const allStats = metricsCollector.getStats();
console.log('Overall performance:', allStats);

// Per-tool stats
const tools = ['load_model', 'finetune_model', 'benchmark_model'];
tools.forEach(tool => {
  const stats = metricsCollector.getStats(tool);
  console.log(`${tool}:`, stats);
});
```

## Troubleshooting

### High Memory Usage

1. Check concurrent operations limit
2. Reduce batch sizes
3. Enable 4-bit quantization
4. Review logs for memory errors

### Slow Performance

1. Check metrics for bottlenecks
2. Review Python dependency versions
3. Ensure GPU is being used (if available)
4. Check disk I/O

### Timeout Errors

1. Increase timeout limit (modify `RESOURCE_LIMITS.MAX_EXECUTION_TIME`)
2. Reduce workload size
3. Check Python environment

### Permission Errors

1. Verify file paths are accessible
2. Check directory write permissions
3. Review security logs for blocked operations

## Security Best Practices

1. **Never run as root** - Use unprivileged user
2. **Validate all inputs** - Already done by validation layer
3. **Monitor logs** - Watch for suspicious patterns
4. **Keep dependencies updated** - Run `npm audit` regularly
5. **Restrict file access** - Use dedicated directories for data
6. **Use environment variables** - Never hardcode credentials
7. **Enable rate limiting** - Prevent abuse
8. **Review Python scripts** - Check generated scripts in logs if suspicious

## Performance Tuning

### Concurrency

Adjust concurrent operation limit:

```typescript
// In src/utils/security.ts
export const RESOURCE_LIMITS = {
  MAX_CONCURRENT_OPERATIONS: 5, // Increase for more parallelism
  // ... other limits
};
```

### Timeout

Adjust timeout for long-running operations:

```typescript
// In src/utils/security.ts
export const RESOURCE_LIMITS = {
  MAX_EXECUTION_TIME: 1200000, // 20 minutes
  // ... other limits
};
```

### Memory Limits

Configure Python memory limits:

```bash
# Set Python memory limit
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
```

## Maintenance

### Log Rotation

Set up logrotate:

```bash
# /etc/logrotate.d/unsloth-mcp
/path/to/unsloth-mcp-server/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 user group
    sharedscripts
}
```

### Regular Tasks

- **Daily**: Check error logs
- **Weekly**: Review metrics, update dependencies
- **Monthly**: Security audit, performance review

## Support

For issues:
1. Check logs in `logs/` directory
2. Run tests: `npm test`
3. Check GitHub issues
4. Provide logs and metrics when reporting issues
