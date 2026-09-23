# Basic Fine-Tuning Example

This example shows how to fine-tune a small Llama model using the Unsloth MCP server.

## Prerequisites

- Unsloth MCP server installed and configured
- Claude Desktop or compatible MCP client
- Unsloth installed: `pip install unsloth`

## Step 1: Check Installation

First, verify that Unsloth is properly installed:

```typescript
const result = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "check_installation",
  arguments: {}
});

console.log(result);
// Expected output: "Unsloth is properly installed."
```

## Step 2: List Available Models

See what models are available for fine-tuning:

```typescript
const models = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "list_supported_models",
  arguments: {}
});

console.log(JSON.parse(models));
// Shows list of supported models like:
// - unsloth/Llama-3.2-1B-bnb-4bit
// - unsloth/Mistral-7B-Instruct-v0.3-bnb-4bit
// - etc.
```

## Step 3: Load a Model

Load a model with Unsloth optimizations:

```typescript
const loadResult = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "load_model",
  arguments: {
    model_name: "unsloth/Llama-3.2-1B-bnb-4bit",
    max_seq_length: 2048,
    load_in_4bit: true,
    use_gradient_checkpointing: true
  }
});

console.log(loadResult);
```

## Step 4: Fine-Tune the Model

Fine-tune on a dataset (using the Alpaca dataset as an example):

```typescript
const finetuneResult = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "finetune_model",
  arguments: {
    model_name: "unsloth/Llama-3.2-1B-bnb-4bit",
    dataset_name: "tatsu-lab/alpaca",
    output_dir: "./my-finetuned-model",
    max_steps: 100,
    batch_size: 2,
    learning_rate: 0.0002,
    max_seq_length: 2048,
    dataset_text_field: "text"
  }
});

console.log(finetuneResult);
// This will take some time depending on your hardware
// Progress will be logged to show training status
```

## Step 5: Generate Text with Fine-Tuned Model

Test your fine-tuned model:

```typescript
const generateResult = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "generate_text",
  arguments: {
    model_path: "./my-finetuned-model",
    prompt: "Write a short story about a robot learning to paint:",
    max_new_tokens: 256,
    temperature: 0.7
  }
});

console.log(generateResult);
```

## Step 6: Export the Model (Optional)

Export your model to GGUF format for use with other tools:

```typescript
const exportResult = await use_mcp_tool({
  server_name: "unsloth-server",
  tool_name: "export_model",
  arguments: {
    model_path: "./my-finetuned-model",
    export_format: "gguf",
    output_path: "./my-model.gguf",
    quantization_bits: 4
  }
});

console.log(exportResult);
```

## Expected Results

- Training should take 5-30 minutes depending on hardware
- The model will be saved to `./my-finetuned-model/`
- Generated text will reflect the fine-tuning dataset's style
- GGUF export will create a quantized model file

## Tips

1. **Memory Issues**: If you run out of VRAM, try:
   - Reducing `batch_size` to 1
   - Reducing `max_seq_length` to 1024
   - Using a smaller model

2. **Speed**: Fine-tuning time varies by:
   - GPU: RTX 3090 (~10 min), RTX 4090 (~5 min), A100 (~3 min)
   - CPU: Not recommended (hours)

3. **Quality**: For better results:
   - Increase `max_steps` to 500-1000
   - Experiment with `learning_rate` (try 1e-4 to 5e-4)
   - Use a larger, higher-quality dataset

## Troubleshooting

- **Import Errors**: Make sure unsloth is installed: `pip install unsloth`
- **CUDA OOM**: Reduce batch size or sequence length
- **Model Not Found**: Check model name spelling and network connection
