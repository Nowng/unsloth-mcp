#!/usr/bin/env python3
"""
Load a pretrained model with Unsloth optimizations.
Usage: python load_model.py --model-name <name> [--max-seq-length <n>] [--4bit <bool>] [--gradient-checkpointing <bool>]
Outputs JSON to stdout.
"""
import argparse
import json
import sys


def main():
    parser = argparse.ArgumentParser(description="Load Unsloth model")
    parser.add_argument("--model-name", required=True)
    parser.add_argument("--max-seq-length", type=int, default=2048)
    parser.add_argument("--4bit", type=str, default="true")
    parser.add_argument("--gradient-checkpointing", type=str, default="true")
    args = parser.parse_args()

    load_in_4bit = args.4bit.lower() == "true"
    use_gradient_checkpointing = args.gradient_checkpointing.lower() == "true"

    try:
        from unsloth import FastLanguageModel

        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=args.model_name,
            max_seq_length=args.max_seq_length,
            load_in_4bit=load_in_4bit,
            use_gradient_checkpointing="unsloth" if use_gradient_checkpointing else False,
        )

        model_info = {
            "model_name": args.model_name,
            "max_seq_length": args.max_seq_length,
            "load_in_4bit": load_in_4bit,
            "use_gradient_checkpointing": use_gradient_checkpointing,
            "vocab_size": tokenizer.vocab_size,
            "model_type": getattr(model.config, "model_type", "unknown"),
            "success": True,
        }

        print(json.dumps(model_info))

    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)


if __name__ == "__main__":
    main()
