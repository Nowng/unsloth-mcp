# Benchmarking and Dataset Preparation

This example shows how to benchmark models and prepare datasets for optimal fine-tuning.

## Part 1: Model Benchmarking

### Get Model Information

Before benchmarking, understand your model's characteristics:

```typescript
const modelInfo = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "get_model_info",
  arguments: {
    model_name: "unsloth/Llama-3.2-1B-bnb-4bit"
  }
});

console.log(JSON.parse(modelInfo));
// Output:
// {
//   "architecture": "LlamaForCausalLM",
//   "parameters": "1.24B",
//   "hidden_size": 2048,
//   "num_layers": 22,
//   "vocab_size": 128256,
//   "max_sequence_length": 131072,
//   "quantization": "4-bit",
//   "memory_footprint": "~1.2GB"
// }
```

### Benchmark Inference Performance

Test model speed and resource usage:

```typescript
const benchmark = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "benchmark_model",
  arguments: {
    model_name: "unsloth/Llama-3.2-1B-bnb-4bit",
    prompt: "Write a detailed explanation of quantum computing:",
    num_iterations: 10,
    max_new_tokens: 128
  }
});

console.log(JSON.parse(benchmark));
// Expected output:
// {
//   "average_time": "1.23s",
//   "min_time": "1.15s",
//   "max_time": "1.34s",
//   "tokens_per_second": 104.2,
//   "memory_used": "1.8GB",
//   "gpu_utilization": "87%"
// }
```

### Compare Multiple Models

Benchmark different models to choose the best one for your use case:

```typescript
const models = [
  "unsloth/Llama-3.2-1B-bnb-4bit",
  "unsloth/Llama-3.2-3B-bnb-4bit",
  "unsloth/Mistral-7B-Instruct-v0.3-bnb-4bit"
];

const results = [];

for (const model of models) {
  const result = await use_mcp_tool({
    server_name: "unsloth-server",
    tool_name: "benchmark_model",
    arguments: {
      model_name: model,
      prompt: "Explain machine learning in simple terms:",
      num_iterations: 5,
      max_new_tokens: 100
    }
  });

  results.push({
    model,
    benchmark: JSON.parse(result)
  });
}

console.log("Benchmark Results:");
results.forEach(r => {
  console.log(`${r.model}:`);
  console.log(`  Speed: ${r.benchmark.tokens_per_second} tokens/s`);
  console.log(`  Memory: ${r.benchmark.memory_used}`);
  console.log(`  Avg Time: ${r.benchmark.average_time}`);
});

// Output helps you choose:
// - Llama-1B: Fastest, lowest memory, good for prototyping
// - Llama-3B: Balanced speed and quality
// - Mistral-7B: Best quality, higher resource usage
```

## Part 2: Dataset Preparation

### Discover Datasets

Find relevant datasets on Hugging Face:

```typescript
const datasets = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "list_datasets",
  arguments: {
    search_query: "instruction following",
    limit: 10
  }
});

console.log(JSON.parse(datasets));
// Shows popular instruction-following datasets:
// - tatsu-lab/alpaca
// - OpenAssistant/oasst1
// - databricks/databricks-dolly-15k
// etc.
```

### Prepare a Standard Dataset

Prepare a Hugging Face dataset for fine-tuning:

```typescript
const prepared = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "prepare_dataset",
  arguments: {
    dataset_name: "tatsu-lab/alpaca",
    output_path: "./datasets/alpaca_prepared.jsonl",
    text_field: "text",
    format: "jsonl"
  }
});

console.log(prepared);
// Output: "Dataset prepared: 52,000 examples saved to ./datasets/alpaca_prepared.jsonl"
```

### Prepare a Custom Dataset

For your own data, format it correctly:

1. **Create your data file** (CSV example):

```csv
instruction,input,output
"Explain what photosynthesis is","","Photosynthesis is the process by which plants..."
"Translate to French","Hello, how are you?","Bonjour, comment allez-vous?"
"Write a haiku about coding","","Code flows like water\nBugs emerge then disappear\nPeace in the console"
```

2. **Prepare the custom dataset**:

```typescript
const customPrep = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "prepare_dataset",
  arguments: {
    dataset_name: "./my_data/training.csv",
    output_path: "./datasets/my_custom.jsonl",
    text_field: "output",  // or create formatted field
    format: "jsonl"
  }
});
```

## Part 3: Full Workflow Example

### Complete Benchmarking + Fine-Tuning + Evaluation Pipeline

```typescript
// 1. Find the right model through benchmarking
console.log("Step 1: Benchmarking models...");

const modelCandidates = [
  "unsloth/Llama-3.2-1B-bnb-4bit",
  "unsloth/Llama-3.2-3B-bnb-4bit"
];

let fastestModel = "";
let bestSpeed = 0;

for (const model of modelCandidates) {
  const bench = await use_mcp_tool({
    server_name: "unsloth-server",
    tool_name: "benchmark_model",
    arguments: {
      model_name: model,
      prompt: "Test prompt",
      num_iterations: 3
    }
  });

  const result = JSON.parse(bench);
  if (result.tokens_per_second > bestSpeed) {
    bestSpeed = result.tokens_per_second;
    fastestModel = model;
  }
}

console.log(`Selected model: ${fastestModel} (${bestSpeed} tok/s)`);

// 2. Find and prepare optimal dataset
console.log("\nStep 2: Finding datasets...");

const datasetSearch = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "list_datasets",
  arguments: {
    search_query: "instruction",
    limit: 5
  }
});

const datasets = JSON.parse(datasetSearch);
const topDataset = datasets[0].id;  // Choose most popular

console.log(`Selected dataset: ${topDataset}`);

const datasetPrep = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "prepare_dataset",
  arguments: {
    dataset_name: topDataset,
    output_path: "./datasets/prepared.jsonl",
    format: "jsonl"
  }
});

// 3. Fine-tune with optimal settings
console.log("\nStep 3: Fine-tuning...");

const finetune = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "finetune_model",
  arguments: {
    model_name: fastestModel,
    dataset_name: "./datasets/prepared.jsonl",
    output_dir: "./models/optimized",
    max_steps: 500,
    batch_size: 2,
    learning_rate: 0.0002
  }
});

console.log("Fine-tuning complete!");

// 4. Benchmark the fine-tuned model
console.log("\nStep 4: Benchmarking fine-tuned model...");

const finalBench = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "benchmark_model",
  arguments: {
    model_name: "./models/optimized",
    prompt: "Write a creative story about AI:",
    num_iterations: 5,
    max_new_tokens: 200
  }
});

console.log("Final performance:", JSON.parse(finalBench));

// 5. Export for production
console.log("\nStep 5: Exporting...");

const export_result = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "export_model",
  arguments: {
    model_path: "./models/optimized",
    export_format: "gguf",
    output_path: "./models/production.gguf",
    quantization_bits: 4
  }
});

console.log("Export complete! Ready for deployment.");
```

## Performance Optimization Tips

### 1. Choose the Right Model Size

Based on benchmarking results:

| Model Size | Speed (tok/s) | Quality | Best For |
|------------|---------------|---------|----------|
| 1B | 100-150 | Good | Prototyping, fast inference |
| 3B | 60-90 | Better | Balanced applications |
| 7B | 30-50 | Best | Quality-critical tasks |

### 2. Dataset Quality > Quantity

- 1,000 high-quality examples > 10,000 noisy examples
- Clean and format your data properly
- Remove duplicates and errors
- Validate a sample before full training

### 3. Benchmark Early and Often

- Benchmark before choosing a model
- Benchmark after fine-tuning to verify improvement
- Benchmark in production conditions (same hardware)
- Track metrics over time

## Real-World Performance Data

Example benchmarks on different hardware:

**RTX 3090 (24GB)**
- Llama-1B: 120 tok/s, 2.1GB memory
- Llama-3B: 75 tok/s, 4.2GB memory
- Mistral-7B: 35 tok/s, 8.5GB memory

**RTX 4090 (24GB)**
- Llama-1B: 180 tok/s, 2.1GB memory
- Llama-3B: 110 tok/s, 4.2GB memory
- Mistral-7B: 52 tok/s, 8.5GB memory

**A100 (80GB)**
- Llama-1B: 220 tok/s, 2.1GB memory
- Llama-3B: 145 tok/s, 4.2GB memory
- Mistral-7B: 85 tok/s, 8.5GB memory

## Troubleshooting

**Benchmark Issues:**
- Inconsistent results: Run more iterations (10-20)
- High variance: Check GPU thermal throttling
- Low performance: Update CUDA drivers

**Dataset Issues:**
- Empty output: Check text_field name
- Format errors: Validate JSON/JSONL syntax
- Low quality: Review data cleaning process

## Next Steps

1. Use benchmarks to choose optimal model for your use case
2. Prepare high-quality datasets
3. Fine-tune with appropriate hyperparameters
4. Validate improvements with post-training benchmarks
5. Export and deploy with confidence
