# Unsloth MCP — LM Studio Plugin

> **36 tools** (35 MCP tools + `plugin_system_info`) for LLM fine-tuning, model optimization, GPU management, and knowledge capture — now packaged as a native **LM Studio Plugin** using `@lmstudio/sdk` + TypeScript. No Docker required.

This project is a port of the original Docker-based standalone MCP server
[**ScientiaCapital/unsloth-mcp-server**](https://github.com/ScientiaCapital/unsloth-mcp-server)
into an **LM Studio Plugin**. The original code did not conform to the LM Studio
Plugin SDK, so the tool logic has been rewritten to run inside LM Studio's built-in
Node.js runtime while keeping every original tool intact.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Porting Project Description](#porting-project-description)
- [Goals](#goals)
- [Architecture](#architecture)
- [Key Changes: Original (Docker) → LM Studio Plugin](#key-changes)
- [MCP Tool Summary](#mcp-tool-summary)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Porting Process](#porting-process)
- [Author Acknowledgements](#author-acknowledgements)
- [Requirements](#requirements)
- [Known Issues](#known-issues)
- [License](#license)
- [Links](#links)

---

## What It Does

- **36 tools** across 5 domains:
  - **Core Unsloth (12)** — check_installation, list_supported_models, load_model, finetune_model, generate_text, export_model, train_superbpe_tokenizer, get_model_info, compare_tokenizers, benchmark_model, list_datasets, prepare_dataset
  - **Knowledge Base (10)** — process_book_image, batch_process_images, search_knowledge, list_knowledge_by_category, get_knowledge_entry, generate_training_pairs, export_training_data, knowledge_stats, check_ocr_backends, list_categories
  - **RunPod GPU Management (11)** — runpod_list_pods, runpod_get_pod, runpod_check_gpus, runpod_create_pod, runpod_start_pod, runpod_stop_pod, runpod_terminate_pod, runpod_start_training, runpod_get_training_status, runpod_get_training_logs, runpod_estimate_cost
  - **Admin (2)** — cost_dashboard, checkpoint_resume
  - **System (1)** — plugin_system_info
- **RunPod integration** — create, start, stop pods programmatically to train on cloud GPUs
- **Knowledge capture pipeline** — OCR → classify → generate training pairs → export dataset
- **Checkpoint management & cost tracking** — resume training and watch GPU spend
- **Plugin self-managed Python venv** — the plugin creates its own `.venv/` and installs the Unsloth toolchain automatically (no system Python, no Docker)

## Porting Project Description

The upstream [**unsloth-mcp-server**](https://github.com/ScientiaCapital/unsloth-mcp-server)
is a **standalone MCP server**: it speaks the Model Context Protocol over stdio and is
consumed by chat clients such as Claude Code. It ships inside a **Docker** container and
runs the Unsloth toolchain on the container's system Python.

This repository **re-implements the same toolset as an LM Studio Plugin**. A LM Studio
Plugin runs *inside* LM Studio's built-in Node.js runtime and is built with
[`@lmstudio/sdk`](https://www.npmjs.com/package/@lmstudio/sdk) + TypeScript — it does
**not** use the MCP stdio transport. To keep the Unsloth toolchain working without Docker,
the plugin now **creates its own Python virtual environment (`.venv/`) and installs the
required packages into it**, then executes the bundled Python scripts through that venv.

In short: *all original tools are preserved; the runtime, packaging, and Python-environment
strategy are rewritten for the LM Studio Plugin model.*

## Goals

Enable the LLM to orchestrate LLM fine-tuning workflows **inside LM Studio** without manual
Python scripting or Docker setup — load a model, prepare/build a dataset, run PEFT / LoRA /
QLoRA training, and export the result, all through provided tools.

---

## Architecture

```
src/
├── index.ts              # Plugin entry point (exports features for LM Studio)
├── toolsProvider.ts      # Registers all 36 tools with the LM Studio SDK
├── config.ts             # Per-chat + global configuration schematics (UI auto-generated)
├── tools/                # Tool factories
│   ├── coreTools.ts       #    12 Core Unsloth tools
│   ├── knowledgeTools.ts  #    10 Knowledge Base tools
│   ├── runpodTools.ts     #    11 RunPod GPU management tools
│   └── adminTools.ts      #     2 Admin tools (cost + checkpoint)
└── core/
    ├── pythonExecutor.ts  # Runs Unsloth toolchain inside the plugin's own venv
    ├── knowledge/         # JSON-based knowledge base (no SQLite dependency)
    │   ├── database.ts
    │   ├── ocr.ts
    │   ├── schema.ts
    │   └── training.ts
    ├── runpod/            # Pure-TypeScript RunPod API client
    ├── utils/             # cache, metrics
    └── scripts/           # Bundled Python scripts executed by pythonExecutor
```

The plugin is split into three LM Studio entry points:

| File | Role |
|------|------|
| `src/index.ts` | Exports `toolsProvider`, `configSchematics`, `globalConfigSchematics`; defines `main(pluginContext)` for the dev harness. |
| `src/toolsProvider.ts` | Builds every tool via the SDK `tool()` function and wires configuration + abort/status signals. |
| `src/config.ts` | Auto-generates the LM Studio settings UI from `createConfigSchematics()`. |

### Key Changes <a name="key-changes"></a>

| Aspect | Original (Docker MCP) | Now (LM Studio Plugin) |
|--------|-----------------------|------------------------|
| Runtime | Docker container, MCP stdio transport | Runs inside LM Studio's Node.js env via `@lmstudio/sdk` |
| Python env | System Python inside the container | **Plugin self-managed venv** (`.venv/`) created by `scripts/setup.cjs` |
| Knowledge DB | SQLite | **JSON-based** storage (no native deps) |
| Standalone MCP | Yes (`cli.ts`, `build/index.js`) | **Removed** — plugin-only |
| Docker | Required | **Removed** |
| Parameter validation | Manual / custom | `zod` schemas per tool |
| Cancellation | N/A | `signal` passed to async calls for graceful abort |

---

## MCP Tool Summary

### Core Unsloth (12)

| Tool | Description |
|------|-------------|
| `check_installation` | Check if Unsloth is installed in the plugin venv. |
| `list_supported_models` | List all models supported by Unsloth. |
| `load_model` | Load a pretrained model with Unsloth optimizations (4-bit, gradient checkpointing). |
| `finetune_model` | Fine-tune a model with LoRA/QLoRA (PEFT). |
| `generate_text` | Generate text using a fine-tuned Unsloth model. |
| `export_model` | Export a fine-tuned model to GGUF, Ollama, vLLM, or Hugging Face. |
| `train_superbpe_tokenizer` | Train a SuperBPE tokenizer (up to 33% fewer tokens). |
| `get_model_info` | Get model architecture / parameter / capability info. |
| `compare_tokenizers` | Compare tokenization efficiency (BPE vs SuperBPE). |
| `benchmark_model` | Benchmark model inference speed and memory usage. |
| `list_datasets` | List popular fine-tuning datasets from Hugging Face. |
| `prepare_dataset` | Prepare and format a dataset for Unsloth fine-tuning. |

### Knowledge Base (10)

| Tool | Description |
|------|-------------|
| `process_book_image` | OCR a book/document image and catalogue the extracted text. |
| `batch_process_images` | OCR and catalogue multiple images at once. |
| `search_knowledge` | Full-text search over the knowledge base. |
| `list_knowledge_by_category` | List knowledge entries by category. |
| `get_knowledge_entry` | Get a specific knowledge entry by ID. |
| `generate_training_pairs` | Generate training-data pairs from knowledge entries. |
| `export_training_data` | Export all training pairs to an Alpaca / ShareGPT / ChatML file. |
| `knowledge_stats` | Statistics about the knowledge base. |
| `check_ocr_backends` | Check available OCR backends (tesseract, easyocr, claude). |
| `list_categories` | List all knowledge categories with descriptions. |

### RunPod GPU Management (11)

| Tool | Description |
|------|-------------|
| `runpod_list_pods` | List all RunPod pods with status, GPU info, and costs. |
| `runpod_get_pod` | Get detailed info about a specific pod. |
| `runpod_check_gpus` | Check available GPU types and pricing on RunPod. |
| `runpod_create_pod` | Create a new RunPod pod for fine-tuning. |
| `runpod_start_pod` | Start a stopped RunPod pod. |
| `runpod_stop_pod` | Stop a running pod (keeps volume data). |
| `runpod_terminate_pod` | Terminate a pod (deletes everything, irreversible). |
| `runpod_start_training` | Start a fine-tuning job on a RunPod pod. |
| `runpod_get_training_status` | Get the status and progress of a training job. |
| `runpod_get_training_logs` | Get training logs from a RunPod pod. |
| `runpod_estimate_cost` | Estimate the cost of a fine-tuning job. |

### Admin (2)

| Tool | Description |
|------|-------------|
| `cost_dashboard` | GPU cost tracking: sessions, daily/weekly/monthly spend, budget alerts. |
| `checkpoint_resume` | List / save / resume training checkpoints. |

### System (1)

| Tool | Description |
|------|-------------|
| `plugin_system_info` | Get information about the plugin environment and system status. |

---

## Installation

Installation is a single command. `npm install` automatically triggers the
**`postinstall`** script, which builds the Python environment for you.

```bash
cd unsloth-mcp

# 1. Install Node.js dependencies AND set up the Python venv (Unsloth toolchain).
#    This runs "postinstall" -> scripts/setup.cjs automatically:
npm install

# 2. Build the TypeScript plugin into dist/.
npm run build

# 3. Type-check, lint, and test (optional but recommended).
npm run typecheck
npm run lint
npm test
```

### What `npm install` does automatically

The `postinstall` script (`scripts/setup.cjs`) performs the following so you never touch
Docker or your system Python:

1. **Detects a Python executable** (3.10–3.12 recommended).
2. **Creates a virtual environment** at `.venv/` in the project root.
3. **Upgrades pip** inside the venv.
4. **Installs the Unsloth toolchain packages**: `unsloth`, `torch`, `transformers`,
   `datasets`, `trl`, `accelerate`, `bitsandbytes`, `tokenizers`, `sentencepiece`,
   `pytesseract`, `easyocr`, `Pillow`, `anthropic`, `huggingface_hub`, `ctranslate2`.
5. **Verifies** the key packages import correctly.

To recreate the venv manually:

```bash
node scripts/setup.cjs --recreate
# or pin a specific Python interpreter:
node scripts/setup.cjs --python /usr/bin/python3.11 --recreate
```

---

## Usage

### In LM Studio (recommended)

1. Install the plugin into LM Studio (from the Hub or as a local plugin).
2. Open the plugin **Settings** and fill in any optional keys:
   - **RunPod API Key** (only if you train on cloud GPUs)
   - **Hugging Face Token** (only for private models/datasets)
   - **Anthropic API Key** (only for the Claude-Vision OCR backend)
   - **Output Directory** (default `./unsloth-output`)
3. Start a chat with a model that has tools enabled. The 36 tools become available to the LLM.
4. Ask the LLM to perform a task, e.g. *"Fine-tune Llama-3.2-1B on my Q&A dataset."*
   The LLM will call the appropriate tools in sequence.

### Typical fine-tuning flow (tool calls)

```
1. list_datasets            # find a dataset name
2. prepare_dataset          # format it for Unsloth
3. finetune_model           # run PEFT / LoRA / QLoRA training
4. export_model             # export to GGUF / Ollama / vLLM
5. generate_text            # test the fine-tuned model
```

See [`skills/unsloth-mcp.md`](skills/unsloth-mcp.md) for a step-by-step guide written for
small models.

---

## Configuration

The settings UI is auto-generated from `src/config.ts`:

- **Global config** (applies to all chats): Python path, RunPod API key, Hugging Face token,
  Anthropic API key, output directory.
- **Per-chat config** (this chat only): model cache toggle, log level, execution timeout.

> **Security:** API keys are read from the LM Studio settings UI or environment variables —
> they are **never hardcoded** in source code, `manifest.json`, or `README.md`.

---

## Porting Process

The port followed the *LM Studio Plugin SDK* workflow (TypeScript). High-level steps:

1. **Adopt the Plugin SDK entry points.** Created `src/index.ts` (exports
   `toolsProvider`, `configSchematics`, `globalConfigSchematics`, and a `main(pluginContext)`
   harness), matching what `@lmstudio/sdk` expects. Removed the standalone MCP stdio server.
2. **Rewrote every tool with `tool()` + `zod`.** Each original tool's logic was re-implemented
   using the SDK `tool({ name, description, parameters, implementation })` shape, with `zod`
   schemas for all parameters and the required second `{ signal, status, warn }` callback.
3. **Replaced Docker Python execution with a plugin venv.** Introduced `src/core/pythonExecutor.ts`
   to run the bundled `.py` scripts through a self-managed `.venv/`, including JSON-output parsing,
   timeouts, abort handling, and venv/system-Python detection.
4. **Wired the `postinstall` setup script.** Added `"postinstall": "node scripts/setup.cjs"` to
   `package.json`; `scripts/setup.cjs` creates the venv and installs the Unsloth toolchain.
5. **Migrated the knowledge database** from SQLite to a dependency-free **JSON** store, and turned
   the RunPod client into a **pure-TypeScript** HTTP client.
6. **Preserved all original tools.** Every MCP tool from the upstream project is present (plus the
   v2.3.0 `cost_dashboard` / `checkpoint_resume` admin tools), with one extra `plugin_system_info`
   tool for environment diagnostics.
7. **Added configuration schematics** (`src/config.ts`) and the LM Studio dev harness
   (`.lmstudio/entry.ts`).
8. **Type-checked, linted, and tested** with `npm run typecheck`, `npm run lint`, `npm test`.

---

## Author Acknowledgements

This plugin is a port of the original [**Unsloth MCP Server**](https://github.com/ScientiaCapital/unsloth-mcp-server),
created and maintained by **ScientiaCapital**. That project was built as part of a personal journey
toward the *Go-To-Market Engineer* role, turning hands-on experiments into real, usable developer tooling.

We are grateful to:

- **The Unsloth team** — for the remarkable Unsloth library that makes fine-tuning ~2x faster and use
  ~80% less memory, which is the technical heart of this project.
- **The open-source community** — for the many libraries this builds on (PyTorch, transformers, datasets,
  trl, SuperBPE, RunPod, and LM Studio's Plugin SDK).
- **LM Studio** — for the Plugin SDK that made it possible to run these tools natively inside LM Studio.
- **The original Unsloth MCP Server contributors** — whose 33+ tools, 180-test discipline, and Docker-based
  design provided the foundation this plugin re-imagines.

The upstream project's author reflects on the lessons learned along the way:

> Building an MCP server that developers actually use taught me API design for developer experience;
> implementing budget tracking and alerts gave me an understanding of the unit economics of GPU compute;
> the RunPod integration taught me programmatic cloud-GPU provisioning; and maintaining 180 Jest tests
> reinforced that shipping quality earns trust. This port carries those lessons forward into the
> LM Studio Plugin world.

---

## Requirements

- Node.js 18+ (LM Studio bundles Node.js v22+)
- Python 3.10–3.12 for the Unsloth toolchain
- NVIDIA GPU with CUDA (for model training / fine-tuning)
- *(Optional)* RunPod account + API key (for cloud GPU training)
- *(Optional)* Hugging Face token (private models/datasets)

## Known Issues

- GRPO training: dtype mismatches in some configurations.
- Requires Python 3.10–3.12 (Python 3.13 is not supported).
- A CUDA-capable GPU is required for fine-tuning.

---

## License

This project is licensed under the **Apache License 2.0** — the same license as the original
[ScientiaCapital/unsloth-mcp-server](https://github.com/ScientiaCapital/unsloth-mcp-server) project.
See [`LICENSE`](LICENSE) for details.

```
Copyright 2025 Unsloth MCP Server Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0
```

---

## Links

- **Original project:** [ScientiaCapital/unsloth-mcp-server](https://github.com/ScientiaCapital/unsloth-mcp-server)
- **LM Studio Plugin SDK guide:** see project docs for developing LM Studio Plugins and compatible MCP Servers (TypeScript).
- **Unsloth:** [https://unsloth.ai](https://unsloth.ai)
