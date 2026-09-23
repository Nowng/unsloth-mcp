# Unsloth MCP Server

**Updated:** 2026-01-18
**Status:** 33 tools working, 180 tests passing, training has environment issues

## Critical Rules

- **NO OpenAI** - Use Anthropic Claude or Google Gemini only
- **API keys in .env only** - Never hardcode
- RunPod API key stored in .env

## What This Project Is

MCP server giving Claude access to Unsloth fine-tuning. 33 tools for model training, RunPod GPU management, knowledge capture, and cost tracking.

## Current Status

| Component | Status |
|-----------|--------|
| MCP tools (33) | Working |
| Test suite (180) | Passing |
| RunPod pod management | Working |
| Knowledge capture | Working |
| GRPO training | Dtype issues |
| SFT training | Environment-dependent |

## Key Files

```
src/index.ts          # Main MCP server (33 tools)
src/utils/runpod.ts   # RunPod API client
src/utils/checkpoint.ts # Training checkpoints
src/utils/cost-tracker.ts # GPU cost tracking
src/knowledge/        # OCR + training data pipeline
src/__tests__/        # 180 tests
```

## Tool Categories

- **Core (12)**: finetune_model, load_model, export_model, etc.
- **Knowledge (10)**: OCR, enhancement, training pair generation
- **RunPod (11)**: Pod lifecycle, training jobs, cost estimation

## Development

```bash
npm run build    # Build TypeScript
npm run test     # 180 tests
npm run start    # Start server
```

## Environment

```bash
RUNPOD_API_KEY=rpa_XXX
HUGGINGFACE_TOKEN=hf_XXX  # Optional
```
