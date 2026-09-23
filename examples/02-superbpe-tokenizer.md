# SuperBPE Tokenizer Training Example

This example demonstrates how to train a SuperBPE tokenizer for improved tokenization efficiency (20-33% token reduction).

## What is SuperBPE?

SuperBPE is a 2025 tokenization method that achieves:
- 20-33% fewer tokens than standard BPE
- Faster inference times
- Lower API costs
- Better performance on downstream tasks

## Prerequisites

- Unsloth MCP server installed
- Training corpus (text dataset)
- Python 3.10-3.12 with Unsloth

## Example 1: Train SuperBPE on WikiText

### Step 1: Prepare Training Corpus

First, prepare a dataset for tokenizer training:

```typescript
const prepResult = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "prepare_dataset",
  arguments: {
    dataset_name: "wikitext",
    output_path: "./data/wikitext_corpus.jsonl",
    text_field: "text",
    format: "jsonl"
  }
});

console.log(prepResult);
// Output: Dataset prepared with X examples
```

### Step 2: Train SuperBPE Tokenizer

Train the tokenizer on your corpus:

```typescript
const trainResult = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "train_superbpe_tokenizer",
  arguments: {
    corpus_path: "./data/wikitext_corpus.jsonl",
    output_path: "./tokenizers/my_superbpe.json",
    vocab_size: 50000,
    num_inherit_merges: 40000  // 80% of vocab_size
  }
});

console.log(trainResult);
// This will take 10-30 minutes depending on corpus size
```

### Step 3: Compare with Standard Tokenizer

Compare efficiency with a standard tokenizer:

```typescript
const sampleText = `
Artificial intelligence and machine learning have revolutionized
the field of natural language processing. Modern large language models
can understand context, generate coherent text, and perform complex
reasoning tasks with impressive accuracy.
`;

const comparison = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "compare_tokenizers",
  arguments: {
    text: sampleText,
    tokenizer1_path: "meta-llama/Llama-3.2-1B",
    tokenizer2_path: "./tokenizers/my_superbpe.json"
  }
});

console.log(comparison);
// Expected output:
// {
//   "tokenizer1": { "name": "Llama-3.2-1B", "tokens": 67 },
//   "tokenizer2": { "name": "my_superbpe", "tokens": 48 },
//   "reduction": "28.36%",
//   "winner": "my_superbpe"
// }
```

## Example 2: Domain-Specific SuperBPE

Train a tokenizer for a specific domain (e.g., medical, legal, code):

### Step 1: Prepare Domain Dataset

```typescript
// For a medical domain dataset
const medicalPrep = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "prepare_dataset",
  arguments: {
    dataset_name: "medical_meadow_medical_flashcards",
    output_path: "./data/medical_corpus.jsonl",
    text_field: "text",
    format: "jsonl"
  }
});
```

### Step 2: Train Domain-Specific Tokenizer

```typescript
const medicalTokenizer = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "train_superbpe_tokenizer",
  arguments: {
    corpus_path: "./data/medical_corpus.jsonl",
    output_path: "./tokenizers/medical_superbpe.json",
    vocab_size: 32000  // Smaller vocab for domain-specific
  }
});
```

### Step 3: Test Domain Performance

```typescript
const medicalText = `
The patient presents with acute myocardial infarction.
ECG shows ST-segment elevation in leads II, III, and aVF,
consistent with inferior wall MI. Troponin levels are elevated
at 15.2 ng/mL. Immediate catheterization is recommended.
`;

const domainComparison = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "compare_tokenizers",
  arguments: {
    text: medicalText,
    tokenizer1_path: "meta-llama/Llama-3.2-1B",
    tokenizer2_path: "./tokenizers/medical_superbpe.json"
  }
});

console.log(domainComparison);
// Domain-specific tokenizers often show >30% improvement
```

## Benefits by Use Case

### 1. API Cost Reduction
If you're using token-based pricing:
- Standard: 1000 tokens = $0.02
- With 30% reduction: 700 tokens = $0.014
- **Savings: 30% on all API calls**

### 2. Context Window Efficiency
- Standard: 8K token context = ~6K words
- SuperBPE: 8K token context = ~8.5K words
- **Fit 40% more content in same context window**

### 3. Inference Speed
- Fewer tokens = faster processing
- 30% token reduction = ~20-25% faster inference
- Especially important for real-time applications

## Best Practices

1. **Corpus Selection**
   - Use 100MB-1GB of representative text
   - Mix different sources for general-purpose
   - Use domain-specific text for specialized applications

2. **Vocab Size**
   - General purpose: 50,000-100,000
   - Domain-specific: 16,000-32,000
   - Resource-constrained: 8,000-16,000

3. **Training Time**
   - Small corpus (100MB): 10-15 minutes
   - Medium corpus (500MB): 30-60 minutes
   - Large corpus (1GB+): 1-3 hours

4. **Validation**
   - Test on held-out data
   - Compare with baseline on multiple text samples
   - Measure actual inference speed improvement

## Advanced: Using SuperBPE with Fine-Tuning

Combine SuperBPE with model fine-tuning for maximum efficiency:

```typescript
// 1. Train SuperBPE tokenizer
const tokenizer = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "train_superbpe_tokenizer",
  arguments: {
    corpus_path: "./data/my_corpus.jsonl",
    output_path: "./tokenizers/my_superbpe.json",
    vocab_size: 50000
  }
});

// 2. Fine-tune model (you can specify custom tokenizer in training config)
const finetuned = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "finetune_model",
  arguments: {
    model_name: "unsloth/Llama-3.2-1B-bnb-4bit",
    dataset_name: "./data/my_dataset.jsonl",
    output_dir: "./models/my_model",
    // Note: Tokenizer integration would be done at the Python level
    max_steps: 500
  }
});
```

## Troubleshooting

- **Long training times**: Reduce corpus size or vocab_size
- **Poor compression**: Use more diverse training corpus
- **High memory usage**: Reduce vocab_size
- **Domain mismatch**: Ensure training corpus matches target domain

## References

- SuperBPE Paper: [Coming soon - 2025]
- Token efficiency benchmarks: See CHANGELOG.md
- Unsloth documentation: https://github.com/unslothai/unsloth
