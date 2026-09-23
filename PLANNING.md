# Unsloth MCP Server - Planning

## Project Vision

Enable Claude Code users to fine-tune LLMs efficiently through an MCP interface, leveraging Unsloth's 2x speed and 80% memory reduction.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Claude Code   │────▶│  MCP Server      │────▶│  Python/Unsloth │
│   (Client)      │     │  (TypeScript)    │     │  (GPU Backend)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                         │
                               ▼                         ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  RunPod API      │────▶│  GPU Pods       │
                        │  (Orchestration) │     │  (A5000/A100)   │
                        └──────────────────┘     └─────────────────┘
```

## Completed Phases

### Phase 1: Core MCP Server (v1.0.0) [DONE]

- [x] Basic MCP server structure
- [x] 6 core tools (check, list, load, finetune, generate, export)
- [x] Python script execution
- [x] Error handling

### Phase 2: Enhanced Tools (v2.0.0) [DONE]

- [x] SuperBPE tokenizer training
- [x] Model information tool
- [x] Tokenizer comparison
- [x] Performance benchmarking
- [x] Dataset discovery & preparation
- [x] 6 additional tools

### Phase 3: Production Infrastructure (v2.1.0) [DONE]

- [x] Configuration system (JSON/env)
- [x] Caching layer (memory + disk)
- [x] Winston structured logging
- [x] Input validation (all 12 tools)
- [x] Security (sanitization, rate limiting)
- [x] Performance metrics
- [x] Progress reporting
- [x] CLI tool
- [x] 43 comprehensive tests
- [x] Pre-commit hooks (Husky)

### Phase 4: Knowledge Capture (v2.2.0) [DONE]

- [x] Multi-engine OCR (Tesseract, EasyOCR, Claude Vision)
- [x] Knowledge database (SQLite)
- [x] AI-powered text enhancement
- [x] Training pair generation
- [x] Export to Alpaca/ShareGPT/ChatML
- [x] 10 knowledge tools

### Phase 5: RunPod Integration (v2.3.0) [DONE]

- [x] RunPod API client (src/utils/runpod.ts)
- [x] Pod lifecycle management (create/start/stop/terminate)
- [x] GPU availability checking
- [x] Training job submission
- [x] Real-time training logs
- [x] Cost estimation
- [x] 11 RunPod tools

## Current Phase

### Phase 6: Cross-Project Integration [IN PROGRESS]

- [ ] End-to-end training test with real data (coperniq-forge)
- [ ] Cost tracking and alerts
- [ ] Checkpoint management
- [ ] Multi-project template
- [ ] FieldVault, NetZero integrations

### Phase 7: Advanced Features [PLANNED]

- [ ] Multi-GPU training support
- [ ] Training visualization
- [ ] Hyperparameter optimization
- [ ] Model versioning
- [ ] A/B testing framework

## Tool Summary (33 total)

| Category          | Tools | Status |
| ----------------- | ----- | ------ |
| Core              | 12    | Done   |
| Knowledge Capture | 10    | Done   |
| RunPod            | 11    | Done   |

## Available Resources

- **Pod**: coperniq-ft2 (yopwr0r7v1pf9j)
- **GPU**: RTX A5000 (24GB VRAM)
- **Storage**: 30GB volume at /runpod
- **Image**: runpod/pytorch:2.2.0-py3.10-cuda12.1.1
- **Cost**: $0.16/hr compute + $0.008/hr storage

## Decision Log

| Date       | Decision                   | Rationale                    |
| ---------- | -------------------------- | ---------------------------- |
| 2025-11-06 | TypeScript MCP server      | Best MCP SDK support         |
| 2025-11-06 | Python backend for Unsloth | Native Unsloth integration   |
| 2025-11-07 | Winston for logging        | Production-grade, structured |
| 2025-11-07 | Jest for testing           | Best TS/JS testing framework |
| 2025-12-21 | RunPod for GPU             | Cost-effective, API-friendly |
| 2025-12-21 | Cross-project infra        | Leverage for all 70 projects |
