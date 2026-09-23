# Unsloth MCP Server Examples

This directory contains practical examples for using the Unsloth MCP server in real-world scenarios.

## Examples Overview

### [01-basic-finetuning.md](./01-basic-finetuning.md)
**Level**: Beginner
**Time**: 30-60 minutes
**Hardware**: Any CUDA GPU with 8GB+ VRAM

Learn the fundamentals of fine-tuning with Unsloth:
- Checking installation
- Loading models
- Fine-tuning on Alpaca dataset
- Generating text
- Exporting models

**Perfect for**: First-time users, quick prototyping

---

### [02-superbpe-tokenizer.md](./02-superbpe-tokenizer.md)
**Level**: Intermediate
**Time**: 1-2 hours
**Hardware**: Any modern CPU/GPU

Master SuperBPE tokenizer training for token efficiency:
- Training general-purpose tokenizers
- Creating domain-specific tokenizers
- Comparing tokenization efficiency
- Achieving 20-33% token reduction

**Perfect for**: Cost optimization, API usage reduction, domain-specific applications

---

### [03-benchmarking-datasets.md](./03-benchmarking-datasets.md)
**Level**: Intermediate
**Time**: 1-2 hours
**Hardware**: CUDA GPU recommended

Learn model benchmarking and dataset preparation:
- Benchmarking inference performance
- Comparing multiple models
- Discovering and preparing datasets
- Complete optimization workflow

**Perfect for**: Performance tuning, model selection, production deployment

---

## Quick Start

1. **Prerequisites**
   ```bash
   # Install Unsloth
   pip install unsloth

   # Build and install the MCP server
   cd unsloth-mcp-server
   npm install
   npm run build

   # Add to your MCP settings (see README.md)
   ```

2. **Choose Your Path**

   **New to Unsloth?**
   → Start with Example 01 (Basic Fine-Tuning)

   **Need Token Efficiency?**
   → Go to Example 02 (SuperBPE Tokenizer)

   **Optimizing Performance?**
   → Check out Example 03 (Benchmarking & Datasets)

3. **Run Examples**

   Each example uses the MCP tool format. You can run them:
   - Through Claude Desktop
   - Via any MCP-compatible client
   - Programmatically using the MCP SDK

## Hardware Requirements

### Minimum (Fine-Tuning)
- GPU: NVIDIA RTX 3060 (12GB VRAM)
- RAM: 16GB
- Storage: 20GB free

### Recommended (Best Experience)
- GPU: NVIDIA RTX 4090 or A100
- RAM: 32GB+
- Storage: 50GB+ SSD

### Budget Option (Small Models)
- GPU: NVIDIA RTX 3060 Ti (8GB)
- Models: Llama-1B, Phi-3-mini
- Reduce batch_size and max_seq_length

## Common Use Cases

### 1. Fine-Tune for Your Domain
**Example 01** → Fine-tune on domain-specific data

Use cases:
- Customer support chatbot
- Code generation for your codebase
- Medical/legal document analysis

### 2. Reduce API Costs
**Example 02** → Train SuperBPE tokenizer

Use cases:
- High-volume API applications
- Cost-sensitive deployments
- Context window optimization

### 3. Optimize for Production
**Example 03** → Benchmark and select optimal model

Use cases:
- Production deployment planning
- Hardware sizing decisions
- Performance SLA requirements

## Estimated Costs & Time

| Task | Time | GPU Hours | Approx. Cost (Cloud GPU) |
|------|------|-----------|--------------------------|
| Basic fine-tuning | 30-60 min | 0.5-1h | $0.50-$1.50 |
| SuperBPE training | 20-60 min | 0.3-1h | $0.30-$1.50 |
| Model benchmarking | 10-30 min | 0.2-0.5h | $0.20-$0.75 |
| Full workflow | 2-4 hours | 2-4h | $3-$10 |

*Based on RTX 4090 cloud pricing (~$1.50/hour)*

## Tips for Success

### 1. Start Small
- Begin with small models (1B-3B parameters)
- Use small datasets for testing (1K-10K examples)
- Run on fewer steps (100-200) initially

### 2. Monitor Resources
```bash
# Watch GPU usage
watch -n 1 nvidia-smi

# Check disk space
df -h

# Monitor logs
tail -f logs/combined.log
```

### 3. Save Checkpoints
Fine-tuning can take hours. Make sure to:
- Save intermediate checkpoints
- Use reliable storage (not external drives)
- Keep backups of successful models

### 4. Version Your Work
```bash
# Tag your models
./my-model-v1/
./my-model-v2-better-data/
./my-model-v3-final/

# Document settings
echo "batch_size=2, lr=2e-4, steps=500" > ./my-model-v3-final/TRAINING_PARAMS.txt
```

## Troubleshooting

### "CUDA Out of Memory"
1. Reduce `batch_size` to 1
2. Reduce `max_seq_length` to 1024
3. Use a smaller model
4. Enable `load_in_4bit: true`

### "Model not found"
1. Check spelling of model name
2. Verify internet connection
3. Try using HuggingFace token for gated models

### "Training is very slow"
1. Verify GPU is being used (check `nvidia-smi`)
2. Reduce `max_seq_length`
3. Use gradient_accumulation_steps instead of large batch_size

### "Poor model quality"
1. Increase `max_steps` (try 500-1000)
2. Use better quality dataset
3. Try different learning_rate (1e-4 to 5e-4)
4. Use larger model if possible

## Next Steps

After completing these examples:

1. **Explore Advanced Features**
   - Custom training loops
   - Multi-GPU training
   - LoRA parameter tuning

2. **Join the Community**
   - Unsloth GitHub: https://github.com/unslothai/unsloth
   - Share your results
   - Contribute examples

3. **Deploy to Production**
   - See PRODUCTION_GUIDE.md
   - Set up monitoring
   - Implement caching and optimization

## Contributing

Have a great example to share?

1. Fork the repository
2. Add your example to this directory
3. Follow the existing format
4. Submit a pull request

We especially welcome examples for:
- Multi-GPU training
- Custom datasets
- Domain-specific applications
- Performance optimization tricks

## Support

- **Issues**: https://github.com/ScientiaCapital/unsloth-mcp-server/issues
- **Documentation**: See main README.md and PRODUCTION_GUIDE.md
- **Unsloth Docs**: https://github.com/unslothai/unsloth

Happy fine-tuning! 🚀
