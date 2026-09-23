# Project Context - Unsloth MCP Server

Last updated: 2026-01-02

## Current State

**Version:** v2.3.0
**Status:** Production-ready
**Tests:** 180/180 passing
**Dependencies:** 0 vulnerabilities

## Done (This Session - 2026-01-02)

### Security Sweep (Mandatory Pre-Commit)

- [x] Secrets scan: No hardcoded keys in code (placeholder in WORK_COMPUTER_SETUP.md only)
- [x] Git history scan: No leaked credentials found
- [x] Dependency audit: 0 vulnerabilities (npm audit clean)
- [x] API security audit: Input validation + sanitization in place
- [x] Environment audit: .env files properly gitignored, not tracked

### Code Review (Uncommitted Changes)

- **CLAUDE.md**: Documentation update - data-forge integration docs added (safe)
- **src/index.ts**: Added cost_dashboard and checkpoint_resume tools (safe)
- **package-lock.json**: Dependencies updated (safe)

### Security Controls Verified

- `src/utils/security.ts`: Rate limiting, script sanitization, timeouts
- `src/utils/validation.ts`: Path traversal prevention, input validation
- All 180 tests passing

## Blockers Encountered

None this session.

## Decisions Made

1. **Key Transfer Method:** Created `.env.coperniq` in zip file (bypasses gitignore) rather than using git for secrets transfer
2. **Security Fix:** Applied `npm audit fix` to resolve qs vulnerability immediately rather than defer

## Tomorrow's Priorities

1. **Test RunPod Training E2E**
   - Connect to existing pod (yopwr0r7v1pf9j)
   - Submit training job with coperniq-forge data
   - Verify model artifact retrieval

2. **langgraph-voice-agents Fine-tuning**
   - Set up training data for voice agent model
   - Configure training parameters
   - Run first training iteration

3. **M2 MacBook Setup**
   - Extract zip and verify RunPod connectivity
   - Test MCP server tools

## Architecture Notes

```
unsloth-mcp-server/
├── src/
│   ├── index.ts        # Main MCP server (33 tools)
│   ├── cli.ts          # CLI interface
│   ├── utils/
│   │   ├── runpod.ts   # RunPod API (pods, training, logs)
│   │   ├── checkpoint.ts # Training checkpoint mgmt
│   │   └── cost-tracker.ts # GPU cost tracking
│   └── knowledge/      # OCR + training data pipeline
└── .claude/skills/     # Claude Code skills (8 skills)
```

## Environment Variables Required

```bash
RUNPOD_API_KEY=rpa_...
RUNPOD_POD_ID=yopwr0r7v1pf9j
SUPABASE_URL=https://xucngysrzjtwqzgcutqf.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ORGANIZATION_ID=scientia-capital
```

## Related Projects

| Project                | Status  | Training Data |
| ---------------------- | ------- | ------------- |
| coperniq-forge         | Ready   | 1,803 samples |
| langgraph-voice-agents | Next up | TBD           |
| FieldVault             | Pending | TBD           |
| NetZero                | Pending | TBD           |
