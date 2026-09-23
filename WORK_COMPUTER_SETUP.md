# Work Computer Setup Guide

Quick setup guide for syncing this project to another machine (M2 MacBook) and configuring RunPod access for the **langgraph-voice-agents** fine-tuning project.

## 1. Clone the Repository

```bash
# If not already cloned
git clone https://github.com/ScientiaCapital/unsloth-mcp-server.git
cd unsloth-mcp-server

# If already cloned, pull latest
cd unsloth-mcp-server
git pull origin main
```

## 2. Install Dependencies

```bash
# Node.js dependencies
npm install
npm run build

# Python dependencies (for local testing)
pip install unsloth torch transformers datasets
```

## 3. Configure Environment Variables

Copy the example and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```bash
# Required for RunPod GPU training
RUNPOD_API_KEY=rpa_YOUR_API_KEY_HERE
RUNPOD_API_ENDPOINT=https://api.runpod.io/v2
RUNPOD_POD_ID=your_active_pod_id

# Required for Supabase (shared with ai-development-cockpit)
SUPABASE_URL=https://xucngysrzjtwqzgcutqf.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ORGANIZATION_ID=scientia-capital
```

### Getting Your RunPod API Key

1. Go to [RunPod Console](https://www.runpod.io/console/user/settings)
2. Navigate to **Settings** > **API Keys**
3. Create a new API key or copy existing one
4. Add to `.env` as `RUNPOD_API_KEY`

## 4. Verify Installation

```bash
# Test the build
npm run build

# Run tests
npm test

# Check RunPod connectivity (via CLI)
npm run cli -- runpod_list_pods
```

## 5. Configure Claude Code MCP

Add to your Claude Code settings (`~/.config/claude-code/settings.json` or IDE settings):

```json
{
  "mcpServers": {
    "unsloth-server": {
      "command": "node",
      "args": ["/path/to/unsloth-mcp-server/build/index.js"],
      "env": {
        "RUNPOD_API_KEY": "${RUNPOD_API_KEY}",
        "HUGGINGFACE_TOKEN": "${HUGGINGFACE_TOKEN}"
      }
    }
  }
}
```

## 6. LangGraph Voice Agents Fine-Tuning

This server is configured to support the **langgraph-voice-agents** project fine-tuning on RunPod.

### Quick Start for Training

```bash
# 1. Check available GPUs
npm run cli -- runpod_check_gpus

# 2. Create or start a pod
npm run cli -- runpod_create_pod --name "voice-agents-training" --gpu "NVIDIA RTX 4090"

# 3. Start training job
npm run cli -- runpod_start_training \
  --base_model "unsloth/Llama-3.2-3B" \
  --dataset_path "your-dataset-path" \
  --output_path "/workspace/voice-agents-model"

# 4. Monitor progress
npm run cli -- runpod_get_training_status --job_id "your_job_id"
```

### Using with Claude Code

Once configured, you can ask Claude to:

- "Check my RunPod pods"
- "Start fine-tuning for voice agents on RunPod"
- "Get training logs from my current job"
- "Estimate cost for training Llama-3.2-3B for 1000 steps"

## 7. Available RunPod Tools

| Tool                         | Description                   |
| ---------------------------- | ----------------------------- |
| `runpod_list_pods`           | List all your pods            |
| `runpod_get_pod`             | Get details of a specific pod |
| `runpod_check_gpus`          | Check available GPU types     |
| `runpod_create_pod`          | Create a new GPU pod          |
| `runpod_start_pod`           | Start a stopped pod           |
| `runpod_stop_pod`            | Stop a running pod            |
| `runpod_terminate_pod`       | Terminate and delete a pod    |
| `runpod_start_training`      | Start a fine-tuning job       |
| `runpod_get_training_status` | Check training progress       |
| `runpod_get_training_logs`   | Get training logs             |
| `runpod_estimate_cost`       | Estimate training cost        |

## 8. Secrets Management

**Never commit secrets to git.** The `.env` file is already in `.gitignore`.

For syncing secrets between machines:

1. Use a password manager (1Password, Bitwarden)
2. Or use environment variables in your shell profile
3. Or securely copy `.env` between machines

## Troubleshooting

### "RunPod API key not found"

Ensure `RUNPOD_API_KEY` is set in your `.env` file.

### "Pod not found"

Your pod may have been terminated. Create a new one with `runpod_create_pod`.

### "CUDA out of memory on RunPod"

Try a larger GPU (A100, H100) or reduce batch size in training config.

## Related Projects

- [langgraph-voice-agents](https://github.com/ScientiaCapital/langgraph-voice-agents) - Voice agent project being fine-tuned
- [ai-development-cockpit](https://github.com/ScientiaCapital/ai-development-cockpit) - Shared Supabase infrastructure
