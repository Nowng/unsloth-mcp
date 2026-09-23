# Unsloth MCP Server - Backlog

## Completed (Phase 4-5)

### RunPod Pod Management ✅

- [x] Create RunPod API client (`src/utils/runpod.ts`)
- [x] `runpod_list_pods` tool - List all pods with status
- [x] `runpod_create_pod` tool - Create new GPU pod
- [x] `runpod_start_pod` tool - Start stopped pod
- [x] `runpod_stop_pod` tool - Stop running pod
- [x] `runpod_terminate_pod` tool - Delete pod
- [x] Cost estimation before pod creation

### RunPod Training Jobs ✅

- [x] `runpod_start_training` tool - Submit fine-tuning job
- [x] `runpod_get_training_logs` tool - Fetch logs
- [x] `runpod_get_training_status` tool - Check progress
- [x] `runpod_estimate_cost` tool - Cost estimation
- [ ] Real-time log streaming via WebSocket
- [ ] `runpod_download_model` tool - Download trained model
- [ ] Training progress webhooks
- [ ] Auto-terminate after training completes

### Checkpoint Management ✅

- [x] Auto-save checkpoints to cloud storage
- [x] Resume training from checkpoint
- [x] Checkpoint versioning
- [x] Cleanup old checkpoints
- [x] Checkpoint metadata tracking
- [x] Resume command generation

### Cost Tracking ✅

- [x] Real-time GPU session cost tracking
- [x] Budget management (daily/weekly/monthly)
- [x] Cost alerts with thresholds
- [x] Per-project cost attribution
- [x] CSV export
- [x] Dashboard with active sessions

### Testing & Validation ✅

- [x] Unit tests for RunPod client (mock API)
- [x] Knowledge module tests (57 tests)
- [x] Checkpoint manager tests
- [x] Cost tracker tests
- [x] 180 total tests passing

## Medium Priority (Phase 6: Advanced)

### Multi-GPU Training

- [ ] Distributed training configuration
- [ ] Multi-pod orchestration
- [ ] FSDP/DeepSpeed integration
- [ ] Automatic GPU scaling

### Training Visualization

- [ ] TensorBoard integration
- [ ] Loss/metric graphs via MCP
- [ ] Training dashboard tool

### Hyperparameter Optimization

- [ ] Grid search support
- [ ] Optuna integration
- [ ] Best model selection
- [ ] Experiment tracking

## Low Priority (Future)

### Model Registry

- [ ] HuggingFace Hub integration
- [ ] Private model registry
- [ ] Model versioning and tagging
- [ ] Model comparison tools

### Advanced Export

- [ ] Ollama direct push
- [ ] vLLM optimization
- [ ] ONNX export
- [ ] MLX export (Apple Silicon)

### Enterprise Features

- [ ] Team collaboration
- [ ] Usage quotas
- [ ] Audit logging
- [ ] SSO integration

## Technical Debt

- [ ] Refactor tool handlers into separate files
- [ ] Add OpenAPI/Swagger docs for tools
- [ ] Improve Python script caching
- [ ] Add retry logic for HuggingFace API calls

## Ideas & Research

- [ ] Evaluate PEFT alternatives
- [ ] Research training on consumer GPUs (RTX 4090)
- [ ] Investigate serverless GPU options
- [ ] Explore model merging techniques

---

_Last updated: 2025-12-28_
