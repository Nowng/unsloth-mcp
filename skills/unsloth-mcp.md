# Unsloth MCP — How To Use The Tools

This file teaches you (a small language model) how to use the Unsloth MCP tools to fine-tune a Large Language Model (LLM). Read it carefully. Follow the steps in order.

## 1. What Are These Tools?
The Unsloth MCP plugin gives you 36 tools. Each tool performs one specific job. 
You call a tool by its exact name and provide its parameters. The tool executes the work (usually running Python + Unsloth) and returns a text answer (often JSON).

The tools can: load models, train models, export models, search datasets, manage cloud GPUs, and process knowledge bases.
**CRITICAL RULE**: You must call tools in the correct order. ALWAYS read the answer of each tool before calling the next tool. The answer may contain an ID, path, or error message you need for the next step.

## 2. Tool Interface (How A Tool Looks)
Every tool has three parts:
- **name**: The exact name you must call. NEVER invent names.
- **parameters**: Inputs. Some are `required` (you MUST provide them). Some are `optional` (you can skip them; a default will be used).
- **return value**: A text answer (often JSON). Read it to know the result.

**Parameter Types**:
- `string`: Text, e.g., `"unsloth/Llama-3.2-1B"`
- `number`: A number, e.g., `16` or `0.0002`
- `boolean`: `true` or `false`
- `array`: A list, written like `["a", "b"]`

**Example Tool Call Format**:
```json
{
  "name": "check_installation",
  "parameters": {}
}
```

## 3. Rules You Must Follow
1. **Use exact tool names**: Copy the name exactly from Section 4. Do not invent names.
2. **Give ALL required parameters**: Missing a required parameter will cause the tool to fail.
3. **Read each answer before the next step**: The answer may contain a `model_path`, `pod_id`, or error message you need for the next tool call.
4. **Keep going step by step**: Make ONE tool call at a time, in order. Do not batch multiple tool calls unless explicitly instructed.
5. **Handle errors**: If a tool returns `Error: ...`, read it, fix the problem (e.g., wrong name, missing file, out of memory), and try again.
6. **Do not skip steps**: Training needs a dataset first. Exporting needs a trained model path first.
7. **Be careful with destructive tools**: `runpod_terminate_pod` deletes a pod forever. Only call it with `confirm: true` when the user explicitly requests it.

## 4. Tool Catalog (All Tools, Grouped)

### A. Core Unsloth Tools (Model + Training)
| Tool name | What it does | Key parameters |
| --- | --- | --- |
| `check_installation` | Check if Unsloth is installed. | none |
| `list_supported_models` | List models Unsloth supports. | none |
| `load_model` | Load a model into memory. | `model_name` (required) |
| `finetune_model` | Fine-tune / PEFT / LoRA / QLoRA training. | `model_name`, `dataset_name`, `output_dir` (all required) |
| `generate_text` | Generate text from a fine-tuned model. | `model_path`, `prompt` (required) |
| `export_model` | Export a model to GGUF / Ollama / vLLM / HF. | `model_path`, `export_format`, `output_path` (required) |
| `train_superbpe_tokenizer` | Train a SuperBPE tokenizer. | `corpus_path`, `output_path` (required) |
| `get_model_info` | Get info about a model. | `model_name` (required) |
| `compare_tokenizers` | Compare two tokenizers. | `text`, `tokenizer1_path`, `tokenizer2_path` |
| `benchmark_model` | Benchmark model speed/memory. | `model_name`, `prompt` (required) |
| `list_datasets` | List Hugging Face datasets. | `search_query` (optional), `limit` (optional) |
| `prepare_dataset` | Format a dataset for training. | `dataset_name`, `output_path` (required); `text_field`, `format` (optional) |

### B. Knowledge Base Tools (Make data from images/books)
| Tool name | What it does | Key parameters |
| --- | --- | --- |
| `process_book_image` | OCR one image, save the text as knowledge. | `image_path` (required) |
| `batch_process_images` | OCR many images at once. | `image_paths` (required) |
| `search_knowledge` | Search saved knowledge. | `query` (required) |
| `list_knowledge_by_category` | List knowledge by category. | `category` (required) |
| `get_knowledge_entry` | Get one knowledge entry by ID. | `entry_id` (required) |
| `generate_training_pairs` | Make training Q&A pairs from knowledge. | `min_quality_score` (optional), `pairs_per_entry` (optional) |
| `export_training_data` | Save training pairs to a file (alpaca/sharegpt/chatml). | `output_path`, `format` (required) |
| `knowledge_stats` | Stats of the knowledge base. | none |
| `check_ocr_backends` | Check OCR engines available. | none |
| `list_categories` | List all categories. | none |

### C. RunPod GPU Tools (Train on cloud GPUs)
| Tool name | What it does | Key parameters |
| --- | --- | --- |
| `runpod_list_pods` | List your GPU pods. | none |
| `runpod_get_pod` | Get one pod's info. | `pod_id` (required) |
| `runpod_check_gpus` | Check available GPUs and prices. | none |
| `runpod_create_pod` | Create a new GPU pod. | `name`, `gpu_type`, `gpu_count`, `volume_gb` (all required) |
| `runpod_start_pod` | Start a stopped pod. | `pod_id` (required) |
| `runpod_stop_pod` | Stop a running pod (data kept). | `pod_id` (required) |
| `runpod_terminate_pod` | Delete a pod forever. | `pod_id`, `confirm: true` (both required) |
| `runpod_start_training` | Start training on a pod. | `pod_id`, `base_model`, `dataset_path`, `output_dir` (all required) |
| `runpod_get_training_status` | Check training progress. | `pod_id` (required) |
| `runpod_get_training_logs` | Read training logs. | `pod_id` (required) |
| `runpod_estimate_cost` | Estimate training cost. | `gpu_type`, `hours` (required) |

### D. Admin + System Tools
| Tool name | What it does | Key parameters |
| --- | --- | --- |
| `cost_dashboard` | Show GPU cost and budget. | none |
| `checkpoint_resume` | List / save / resume checkpoints. | `action` (required: "list", "save", or "resume"), `checkpoint_path` (required for save/resume) |
| `plugin_system_info` | Show plugin environment info. | none |

## 5. Common Parameters (Repeat Often)
- `model_name`: A model string, e.g., `"unsloth/Llama-3.2-1B-bnb-4bit"`.
- `output_dir`: Where to save results, e.g., `"./unsloth-output/my-model"`.
- `lora_rank` (or `lora_r`): LoRA rank. Common values: `8`, `16`, `32`. Default is `16`.
- `learning_rate`: Usually `0.0002` (written as `2e-4`).
- `max_steps`: How many training steps. More steps = longer but often better.
- `export_format`: Must be one of: `"gguf"`, `"ollama"`, `"vllm"`, `"huggingface"`.

## 6. Workflows (Step By Step)

### Workflow 1 — Build A Training Dataset (from scratch)
**Goal**: Create a dataset file you can use for training.
- **Step 1**: Decide the topic and format. Pick a topic (e.g., "customer support Q&A"). Use Alpaca format (simplest):
  ```json
  [
    { "instruction": "Greet the customer.", "input": "", "output": "Hello! Thank you for contacting support. How can I help you today?" }
  ]
  ```
- **Step 2**: Save it to a file, e.g., `dataset.json`, using your file tools.
- **Step 3**: Prepare the dataset for Unsloth (format it correctly):
  ```json
  {
    "name": "prepare_dataset",
    "parameters": {
      "dataset_name": "dataset.json",
      "output_path": "./unsloth-output/dataset.prepared.jsonl",
      "text_field": "text",
      "format": "jsonl"
    }
  }
  ```
  *Result*: You now have a training-ready dataset at `output_path`.

### Workflow 2 — PEFT / LoRA / QLoRA Training (The Main Task)
**Goal**: Fine-tune a small model with low-rank adaptation (PEFT). This is fast and uses little memory. QLoRA = 4-bit base model + LoRA.
- **Step 1**: Check Unsloth is installed: `check_installation()`
- **Step 2**: Pick a supported model (optional, for reference): `list_supported_models()`. Choose a small model for speed, e.g., `"unsloth/Llama-3.2-1B-bnb-4bit"`.
- **Step 3**: Make sure you have a dataset (see Workflow 1). You need the `dataset_name` path.
- **Step 4**: Run fine-tuning. This is the key tool.
  ```json
  {
    "name": "finetune_model",
    "parameters": {
      "model_name": "unsloth/Llama-3.2-1B-bnb-4bit",
      "dataset_name": "./unsloth-output/dataset.prepared.jsonl",
      "output_dir": "./unsloth-output/lora-llama1b",
      "lora_rank": 16,
      "lora_alpha": 16,
      "batch_size": 2,
      "gradient_accumulation_steps": 4,
      "learning_rate": 0.0002,
      "max_steps": 100,
      "dataset_text_field": "text",
      "load_in_4bit": true
    }
  }
  ```
  *Result*: Read the answer. It should say "Successfully fine-tuned model".
- **Step 5**: Test the new model by generating text:
  ```json
  {
    "name": "generate_text",
    "parameters": {
      "model_path": "./unsloth-output/lora-llama1b",
      "prompt": "Greet the customer.",
      "max_new_tokens": 128
    }
  }
  ```
  *Result*: If the answer looks good, continue. If not, train longer (more `max_steps`) or use a bigger dataset.

### Workflow 3 — Export The Fine-Tuned Model
**Goal**: Turn the fine-tuned model into a file you can use in other apps.
- **Step 1**: Export it.
  ```json
  {
    "name": "export_model",
    "parameters": {
      "model_path": "./unsloth-output/lora-llama1b",
      "export_format": "gguf",
      "output_path": "./unsloth-output/lora-llama1b.gguf",
      "quantization_bits": 4
    }
  }
  ```
- **Step 2**: Verify the file exists at `output_path`. Now you can load it in Ollama / vLLM / Hugging Face.

### Workflow 4 — Train On A Cloud GPU (RunPod)
**Goal**: Train on a remote GPU when your local machine is too weak.
- **Step 1**: Create a pod:
  ```json
  {
    "name": "runpod_create_pod",
    "parameters": {
      "name": "training-pod",
      "gpu_type": "NVIDIA RTX A5000",
      "gpu_count": 1,
      "volume_gb": 30
    }
  }
  ```
  *Result*: Read the answer to get the `pod_id`.
- **Step 2**: Start training on the pod:
  ```json
  {
    "name": "runpod_start_training",
    "parameters": {
      "pod_id": "<the pod_id from Step 1>",
      "base_model": "unsloth/Llama-3.2-1B-bnb-4bit",
      "dataset_path": "/path/on/pod/dataset.prepared.jsonl",
      "output_dir": "/path/on/pod/output",
      "lora_r": 16,
      "epochs": 3
    }
  }
  ```
- **Step 3**: Watch progress: `runpod_get_training_status(pod_id="<the pod_id>")`. Repeat until training finishes. Then use `runpod_stop_pod` to stop paying.

### Workflow 5 — Save Training Data From Knowledge Base
**Goal**: Turn saved knowledge into a training dataset automatically.
- **Step 1**: Generate pairs from your knowledge base:
  ```json
  {
    "name": "generate_training_pairs",
    "parameters": {
      "min_quality_score": 30,
      "pairs_per_entry": 3
    }
  }
  ```
- **Step 2**: Export to a file for training:
  ```json
  {
    "name": "export_training_data",
    "parameters": {
      "output_path": "./unsloth-output/knowledge-train.jsonl",
      "format": "alpaca",
      "min_quality_score": 30
    }
  }
  ```
  *Result*: Now use that file in Workflow 2, Step 4.

### Workflow 6 — Resume Training From Checkpoint
**Goal**: Continue training from a previously saved state if interrupted.
- **Step 1**: List available checkpoints:
  ```json
  {
    "name": "checkpoint_resume",
    "parameters": {
      "action": "list"
    }
  }
  ```
- **Step 2**: Resume training using the latest or desired checkpoint path:
  ```json
  {
    "name": "checkpoint_resume",
    "parameters": {
      "action": "resume",
      "checkpoint_path": "./unsloth-output/lora-llama1b/checkpoint-500"
    }
  }
  ```

### Workflow 7 — Benchmark and Model Selection
**Goal**: Ensure the chosen model fits your hardware constraints before starting a long training run.
- **Step 1**: List supported models: `list_supported_models()`
- **Step 2**: Benchmark a candidate model's memory and speed:
  ```json
  {
    "name": "benchmark_model",
    "parameters": {
      "model_name": "unsloth/Llama-3.2-1B-bnb-4bit",
      "prompt": "Write a short story about a cat."
    }
  }
  ```
- **Step 3**: If the benchmark shows "Out of Memory", choose a smaller model or enable `load_in_4bit: true` in your training plan.

### Workflow 8 — Debug Failed Training
**Goal**: Diagnose why a training run failed or is not converging.
- **Step 1**: If training locally, check the `finetune_model` error message. Common fixes: lower `batch_size`, lower `learning_rate`, or increase `max_steps`.
- **Step 2**: If training on RunPod, fetch the logs:
  ```json
  {
    "name": "runpod_get_training_logs",
    "parameters": {
      "pod_id": "<your_pod_id>"
    }
  }
  ```
- **Step 3**: Analyze the logs for keywords like "CUDA out of memory", "NaN loss", or "File not found". Fix the root cause and restart.

## 7. Quick Reference: Order Of Tools For A Full Job
1. `check_installation`
2. `list_datasets` (or build data with `process_book_image` / `generate_training_pairs`)
3. `prepare_dataset`
4. `finetune_model` ← **the training step**
5. `generate_text` ← **test it**
6. `export_model` ← **save it**

## 8. If Something Goes Wrong
- **"Error: tool not found"** → The name is wrong. Check the catalog in Section 4.
- **Missing parameter** → You left out a required parameter. Add it.
- **File not found** → The `dataset_name` or `model_path` is wrong, or the file was not created. Check the path.
- **Out of memory (training)** → Use a smaller model, set `load_in_4bit=true`, lower `batch_size`, or use RunPod (Workflow 4).
- **Training loss not going down** → Increase `max_steps` or `learning_rate`, or improve dataset quality.

## 9. Reminder
- Use **exact** tool names.
- Give **all** required parameters.
- Read **each** answer before the next call.
- Training needs a dataset first; export needs a trained model path first.
