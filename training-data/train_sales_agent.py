#!/usr/bin/env python3
"""
Coperniq Sales Agent Fine-Tuning Script v2

Model: Qwen2.5-3B-Instruct (multilingual: Spanish + English)
Method: SFT with ChatML format
VRAM: ~4GB with 4-bit quantization (fits 8GB GPU)
Dataset: 1,475 conversations from 5 sales books + Coperniq internal docs

Training sources:
- Never Split the Difference (negotiation)
- Blue Ocean Strategy (market positioning)
- Business Model Generation (value proposition)
- Jobs-to-be-Done (customer needs)
- Challenger Sale (sales methodology)
- Coperniq internal: website, Notion, Miro ICP

Run on RunPod:
    python train_sales_agent.py

Run locally (8GB+ VRAM):
    python train_sales_agent.py
"""

import json
import os
from pathlib import Path

# Unsloth imports
from unsloth import FastLanguageModel
from unsloth.chat_templates import get_chat_template
from trl import SFTTrainer, SFTConfig
from datasets import Dataset

# =============================================================================
# CONFIGURATION
# =============================================================================

# Model - Qwen2.5-3B is optimal for 8GB VRAM with multilingual support
MODEL_NAME = "unsloth/Qwen2.5-3B-Instruct"
MAX_SEQ_LENGTH = 2048
LOAD_IN_4BIT = True  # Required for 8GB VRAM

# LoRA Configuration
LORA_R = 16           # Rank - higher = more capacity, more VRAM
LORA_ALPHA = 16       # Scaling factor
LORA_DROPOUT = 0      # Unsloth recommendation

# Training Configuration
EPOCHS = 3
BATCH_SIZE = 2
GRADIENT_ACCUMULATION = 4
LEARNING_RATE = 2e-4
WARMUP_STEPS = 10

# Output
OUTPUT_DIR = "coperniq_sales_agent"
GGUF_QUANTIZATION = "q4_k_m"  # Good balance of size/quality


def load_dataset():
    """Load ChatML formatted sales dataset."""
    data_path = Path(__file__).parent / "sales_agent_chatml.json"

    if not data_path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {data_path}\n"
            "Run the data preparation script first."
        )

    with open(data_path) as f:
        raw_data = json.load(f)

    conversations = raw_data.get("data", [])
    metadata = raw_data.get("metadata", {})

    print(f"Loaded {len(conversations)} conversations")
    print(f"Sources: {', '.join(metadata.get('sources', []))}")
    print(f"Languages: {metadata.get('languages', ['en'])}")

    return Dataset.from_list(conversations)


def main():
    print("=" * 60)
    print("Coperniq Sales Agent Training v2")
    print("=" * 60)
    print(f"Model: {MODEL_NAME}")
    print(f"4-bit quantization: {LOAD_IN_4BIT}")
    print(f"Max sequence length: {MAX_SEQ_LENGTH}")
    print(f"LoRA rank: {LORA_R}")
    print()

    # -------------------------------------------------------------------------
    # 1. Load Model
    # -------------------------------------------------------------------------
    print("Loading model...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MODEL_NAME,
        max_seq_length=MAX_SEQ_LENGTH,
        load_in_4bit=LOAD_IN_4BIT,
        dtype=None,  # Auto-detect best dtype
    )

    # Apply Qwen chat template (Unsloth validated)
    tokenizer = get_chat_template(
        tokenizer,
        chat_template="qwen-2.5",
    )

    # -------------------------------------------------------------------------
    # 2. Configure LoRA
    # -------------------------------------------------------------------------
    print("Configuring LoRA...")
    model = FastLanguageModel.get_peft_model(
        model,
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
        lora_dropout=LORA_DROPOUT,
        bias="none",
        use_gradient_checkpointing="unsloth",  # 60% less VRAM
        random_state=42,
    )

    # -------------------------------------------------------------------------
    # 3. Load Dataset
    # -------------------------------------------------------------------------
    print("\nLoading dataset...")
    dataset = load_dataset()

    # Apply chat template to dataset
    def format_chat(example):
        return {
            "text": tokenizer.apply_chat_template(
                example["messages"],
                tokenize=False,
                add_generation_prompt=False,
            )
        }

    dataset = dataset.map(format_chat)

    # -------------------------------------------------------------------------
    # 4. Configure Trainer
    # -------------------------------------------------------------------------
    print("\nConfiguring trainer...")
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=SFTConfig(
            # Batch settings
            per_device_train_batch_size=BATCH_SIZE,
            gradient_accumulation_steps=GRADIENT_ACCUMULATION,

            # Training settings
            warmup_steps=WARMUP_STEPS,
            num_train_epochs=EPOCHS,
            learning_rate=LEARNING_RATE,

            # Precision
            fp16=not FastLanguageModel.is_bfloat16_supported(),
            bf16=FastLanguageModel.is_bfloat16_supported(),

            # Logging
            logging_steps=10,
            save_steps=100,

            # Output
            output_dir=OUTPUT_DIR,

            # Optimization
            optim="adamw_8bit",
            seed=42,

            # Packing - 2-5x speedup for mixed-length conversations
            packing=True,

            # Dataset field
            dataset_text_field="text",
        ),
    )

    # -------------------------------------------------------------------------
    # 5. Train
    # -------------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("Starting training...")
    print("=" * 60)

    trainer_stats = trainer.train()

    print("\nTraining complete!")
    print(f"Training time: {trainer_stats.metrics['train_runtime']:.2f}s")

    # -------------------------------------------------------------------------
    # 6. Save Outputs
    # -------------------------------------------------------------------------

    # Save LoRA weights (~100MB)
    print("\nSaving LoRA weights...")
    lora_path = f"{OUTPUT_DIR}/lora"
    model.save_lora(lora_path)
    print(f"  → {lora_path}/")

    # Save merged model (~6GB)
    print("\nSaving merged model (16-bit)...")
    merged_path = f"{OUTPUT_DIR}/merged"
    model.save_pretrained_merged(
        merged_path,
        tokenizer,
        save_method="merged_16bit",
    )
    print(f"  → {merged_path}/")

    # Export to GGUF for Ollama (~1.5GB)
    print(f"\nExporting to GGUF ({GGUF_QUANTIZATION})...")
    gguf_path = f"{OUTPUT_DIR}/gguf"
    model.save_pretrained_gguf(
        gguf_path,
        tokenizer,
        quantization_method=GGUF_QUANTIZATION,
    )
    print(f"  → {gguf_path}/")

    # -------------------------------------------------------------------------
    # 7. Create Ollama Modelfile
    # -------------------------------------------------------------------------
    modelfile_content = f'''FROM ./{gguf_path}/unsloth.Q4_K_M.gguf

TEMPLATE """{{{{.System}}}}

{{{{.Prompt}}}}
"""

SYSTEM """You are a world-class sales professional for Coperniq, the AI-native operating system for MEP contractors. You can respond in English or Spanish."""

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_ctx 2048
'''

    modelfile_path = f"{OUTPUT_DIR}/Modelfile"
    with open(modelfile_path, "w") as f:
        f.write(modelfile_content)
    print(f"  → {modelfile_path}")

    # -------------------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("TRAINING COMPLETE!")
    print("=" * 60)
    print(f"""
Outputs:
  {OUTPUT_DIR}/
  ├── lora/           (~100MB) - LoRA adapter weights
  ├── merged/         (~6GB)   - Full merged model
  ├── gguf/           (~1.5GB) - Quantized GGUF
  └── Modelfile       (Ollama config)

To deploy with Ollama:
  cd {OUTPUT_DIR}
  ollama create coperniq-sales -f Modelfile
  ollama run coperniq-sales

Example prompts:
  - "How do I qualify a lead using BANT?"
  - "Explica la estrategia del océano azul"
  - "Handle objection: 'Your price is too high'"
""")


if __name__ == "__main__":
    main()
