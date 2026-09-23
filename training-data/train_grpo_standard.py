#!/usr/bin/env python3
"""
GRPO Fine-Tuning Script (Standard TRL/PEFT version - no Unsloth)

This script runs GRPO training using standard HuggingFace/TRL libraries.
It's slower than Unsloth but has fewer version conflicts.
"""

import json
import yaml
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional
import time

# Standard imports
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import GRPOTrainer, GRPOConfig
from datasets import Dataset

# =============================================================================
# Configuration
# =============================================================================

CONFIG_PATH = Path(__file__).parent / "grpo_config.yaml"
EXPERIMENTS_LOG = Path(__file__).parent / "experiments.md"


def load_config() -> dict:
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)


def save_config(config: dict):
    with open(CONFIG_PATH, 'w') as f:
        yaml.dump(config, f, default_flow_style=False, sort_keys=False)


# =============================================================================
# Reward Function (simplified)
# =============================================================================

MEP_KEYWORDS = [
    "mep", "contractor", "project", "estimate", "bid", "proposal",
    "client", "customer", "hvac", "electrical", "plumbing", "mechanical",
    "subcontractor", "solar", "residential", "commercial", "installation",
]

COPERNIQ_KEYWORDS = [
    "coperniq", "workflow", "pipeline", "stages", "hierarchy", "sla",
    "blocking", "automation", "portal", "dispatch", "site survey",
]

SALES_KEYWORDS = [
    "demo", "onboard", "roi", "value", "benefit", "pain point",
    "challenge", "solution", "implement", "integrate", "timeline",
]

ALL_KEYWORDS = set(MEP_KEYWORDS + COPERNIQ_KEYWORDS + SALES_KEYWORDS)


def reward_function(completions, prompts=None, **kwargs):
    """Score completions based on keyword coverage, length, and structure."""
    rewards = []

    for completion in completions:
        text = completion.lower() if isinstance(completion, str) else ""

        # Keyword coverage (40%)
        words = set(text.split())
        matches = len(words.intersection(ALL_KEYWORDS))
        keyword_score = min(matches / 5, 1.0) * 0.4

        # Length (30%) - prefer 100-300 words
        word_count = len(text.split())
        if 100 <= word_count <= 300:
            length_score = 0.3
        elif 50 <= word_count < 100 or 300 < word_count <= 500:
            length_score = 0.2
        else:
            length_score = 0.1

        # Structure (30%) - has punctuation, paragraphs
        structure_score = 0.0
        if "?" in text: structure_score += 0.1
        if "\n" in text or len(text) > 200: structure_score += 0.1
        if any(p in text for p in [".", "!", "..."]): structure_score += 0.1

        reward = keyword_score + length_score + structure_score
        rewards.append(reward)

    return rewards


# =============================================================================
# Main Training
# =============================================================================

def main(iteration: Optional[int] = None):
    """Run GRPO training iteration."""

    config = load_config()
    current_iteration = iteration or config.get('iteration', 1)

    print("=" * 60)
    print(f"GRPO Training (Standard) - Iteration {current_iteration}")
    print("=" * 60)

    config['iteration'] = current_iteration
    config['status'] = 'running'
    save_config(config)

    start_time = time.time()

    try:
        # =====================================================================
        # 1. Load Model with 4-bit Quantization
        # =====================================================================
        print("\n📦 Loading model...")
        model_config = config['model']

        # 4-bit quantization config
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
        )

        model = AutoModelForCausalLM.from_pretrained(
            model_config['name'],
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
        )

        tokenizer = AutoTokenizer.from_pretrained(
            model_config['name'],
            trust_remote_code=True,
        )

        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        # =====================================================================
        # 2. Configure LoRA
        # =====================================================================
        print("🔧 Configuring LoRA...")
        lora_cfg = config['lora']

        model = prepare_model_for_kbit_training(model)

        peft_config = LoraConfig(
            r=lora_cfg['r'],
            lora_alpha=lora_cfg['alpha'],
            target_modules=lora_cfg['target_modules'],
            lora_dropout=lora_cfg['dropout'],
            bias="none",
            task_type="CAUSAL_LM",
        )

        model = get_peft_model(model, peft_config)
        model.print_trainable_parameters()

        # =====================================================================
        # 3. Load Training Data
        # =====================================================================
        print("📚 Loading training data...")
        data_path = Path(__file__).parent / "grpo_prompts.json"

        with open(data_path) as f:
            prompts_data = json.load(f)

        dataset = Dataset.from_list([
            {"prompt": p["prompt"]} for p in prompts_data["prompts"]
        ])

        print(f"   Loaded {len(dataset)} training prompts")

        # =====================================================================
        # 4. Configure GRPO Trainer
        # =====================================================================
        print("⚙️  Configuring GRPO trainer...")
        grpo_cfg = config['grpo']
        output_dir = f"{config['output']['dir']}/iteration_{current_iteration}"

        training_args = GRPOConfig(
            output_dir=output_dir,
            num_generations=grpo_cfg['num_generations'],
            max_completion_length=grpo_cfg['max_completion_length'],
            beta=grpo_cfg['beta'],
            learning_rate=grpo_cfg['learning_rate'],
            num_train_epochs=grpo_cfg['num_train_epochs'],
            per_device_train_batch_size=grpo_cfg['per_device_train_batch_size'],
            gradient_accumulation_steps=grpo_cfg['gradient_accumulation_steps'],
            warmup_ratio=grpo_cfg['warmup_ratio'],
            weight_decay=grpo_cfg['weight_decay'],
            optim=grpo_cfg['optim'],
            bf16=grpo_cfg['bf16'],
            logging_steps=grpo_cfg['logging_steps'],
            save_steps=grpo_cfg['save_steps'],
            seed=42 + current_iteration,
        )

        trainer = GRPOTrainer(
            model=model,
            args=training_args,
            train_dataset=dataset,
            processing_class=tokenizer,
            reward_funcs=reward_function,
        )

        # =====================================================================
        # 5. Train
        # =====================================================================
        print("\n" + "=" * 60)
        print("🚀 Starting GRPO training...")
        print("=" * 60)

        trainer.train()

        train_time = (time.time() - start_time) / 60

        # =====================================================================
        # 6. Save
        # =====================================================================
        print("\n💾 Saving model...")
        trainer.save_model(output_dir)
        tokenizer.save_pretrained(output_dir)

        print(f"\n✅ Training complete in {train_time:.1f} minutes")
        print(f"   Model saved to: {output_dir}")

        config['status'] = 'completed'
        save_config(config)

        return {
            'train_time_mins': train_time,
            'output_dir': output_dir,
        }

    except Exception as e:
        config['status'] = 'failed'
        save_config(config)
        print(f"\n❌ Training failed: {e}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--iteration', type=int, default=None)
    args = parser.parse_args()

    main(iteration=args.iteration)
