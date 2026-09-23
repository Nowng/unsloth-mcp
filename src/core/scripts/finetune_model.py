#!/usr/bin/env python3
"""
Fine-tune a model with Unsloth optimizations.
Usage: python finetune_model.py --model-name <name> --dataset <ds> --output-dir <dir> [options]
Outputs JSON to stdout.
"""
import argparse
import json
import os
import sys


def parse_bool(value):
    return str(value).lower() == "true"


def main():
    parser = argparse.ArgumentParser(description="Fine-tune model with Unsloth")
    parser.add_argument("--model-name", required=True)
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--max-seq-length", type=int, default=2048)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=16)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--grad-accum", type=int, default=4)
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--max-steps", type=int, default=100)
    parser.add_argument("--text-field", default="text")
    parser.add_argument("--4bit", type=str, default="true")
    args = parser.parse_args()

    try:
        os.makedirs(args.output_dir, exist_ok=True)

        from unsloth import FastLanguageModel
        from datasets import load_dataset
        from trl import SFTTrainer, SFTConfig

        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=args.model_name,
            max_seq_length=args.max_seq_length,
            load_in_4bit=parse_bool(args.4bit),
            use_gradient_checkpointing="unsloth",
        )

        model = FastLanguageModel.get_peft_model(
            model,
            r=args.lora_r,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            lora_alpha=args.lora_alpha,
            use_gradient_checkpointing="unsloth",
            random_state=3407,
            max_seq_length=args.max_seq_length,
            use_rslora=False,
            loftq_config=None,
        )

        dataset = load_dataset(args.dataset) if not os.path.exists(args.dataset) else load_dataset("json", data_files=args.dataset)

        trainer = SFTTrainer(
            model=model,
            train_dataset=dataset["train"],
            tokenizer=tokenizer,
            args=SFTConfig(
                dataset_text_field=args.text_field,
                max_seq_length=args.max_seq_length,
                per_device_train_batch_size=args.batch_size,
                gradient_accumulation_steps=args.grad_accum,
                warmup_steps=10,
                max_steps=args.max_steps,
                learning_rate=args.learning_rate,
                output_dir=args.output_dir,
                optim="adamw_8bit",
                seed=3407,
            ),
        )

        trainer.train()
        trainer.save_model()

        print(json.dumps({
            "success": True,
            "output_dir": args.output_dir,
            "model_name": args.model_name,
            "dataset_name": args.dataset,
            "max_steps": args.max_steps,
        }))

    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)


if __name__ == "__main__":
    main()
