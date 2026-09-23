# Unsloth MCP Server - Current Tasks

## Active Sprint: Cross-Project Training Infrastructure

### In Progress

- [ ] **Test RunPod training end-to-end with real data**
  - Use coperniq-forge training samples (1,803 ready)
  - Verify MCP tools work from Claude Code
  - Test model artifact retrieval

### Up Next

- [ ] **Add cost tracking dashboard**
  - Real-time GPU usage tracking
  - Cost alerts when threshold exceeded
  - History of training jobs

- [ ] **Checkpoint management**
  - Save/load training checkpoints
  - Resume interrupted training
  - Checkpoint comparison

- [ ] **Multi-project training support**
  - Template for new projects
  - Shared infrastructure docs (/.shared/)
  - FieldVault, NetZero integrations

## Recently Completed

### v2.3.0 - RunPod Integration [DONE]

- [x] RunPod API client (src/utils/runpod.ts)
- [x] 11 RunPod tools (create, start, stop, terminate, etc.)
- [x] Training job submission
- [x] Real-time training logs
- [x] Cost estimation

### v2.2.0 - Knowledge Capture [DONE]

- [x] 10 knowledge capture tools
- [x] Multi-engine OCR (Tesseract, EasyOCR, Claude Vision)
- [x] Training pair generation
- [x] Export to Alpaca/ShareGPT/ChatML

### v2.1.0 - Production Infrastructure [DONE]

- [x] 12 core MCP tools
- [x] Configuration system
- [x] Caching layer
- [x] Winston logging
- [x] 87 test cases
- [x] Pre-commit hooks

## Security Audit (2025-12-31)

- [x] Secrets scan: PASSED (no hardcoded keys)
- [x] Git history: PASSED (template strings only)
- [x] Dependencies: PASSED (0 vulnerabilities - fixed qs DoS)
- [x] Env audit: PASSED (.env.\* patterns in .gitignore)
- [x] API security: PASSED (no injection vulnerabilities)

## Session: 2025-12-31

### Completed Today

- [x] Updated `.env.example` with RunPod/Supabase config
- [x] Created `WORK_COMPUTER_SETUP.md` for M2 sync
- [x] Created transfer zip with keys for Slack upload
- [x] Fixed 2 HIGH npm vulnerabilities (qs)
- [x] Full test suite: 180/180 passing

## Blocked

None currently

## Quick Reference

```bash
# Build and test
npm run build && npm test

# Run server
npm run start

# CLI dashboard
npm run cli

# Check RunPod pods
npx ts-node -e "import {listPods} from './src/utils/runpod'; listPods().then(console.log)"
```

## Related Projects

- **coperniq-forge**: Sales email training (1,803 samples ready)
- **FieldVault**: Field service dispatcher
- **NetZero**: Carbon accounting
- **Shared infra**: ~/.shared/training-infrastructure.md
