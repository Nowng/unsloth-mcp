#!/usr/bin/env bash
set -euo pipefail

echo "==> unsloth-mcp-server init"

if [ ! -f .env ]; then
  echo "WARNING: .env not found — add RUNPOD_API_KEY and HUGGINGFACE_TOKEN"
fi

echo "==> Installing dependencies"
npm install

echo "==> Building TypeScript"
npm run build

echo "==> Done. Commands:"
echo "  npm run start        — start MCP server"
echo "  npm run test         — run 180 Jest tests"
echo "  npm run dev          — run with ts-node (no build needed)"
