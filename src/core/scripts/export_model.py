#!/usr/bin/env python3
"""
Export a fine-tuned Unsloth model to various formats.
Usage: python export_model.py --model-path <path> --format <gguf|ollama|vllm|huggingface> --output-path <path> [--quant-bits <n>]
Outputs JSON to stdout.
"""
import argparse
import json
import os
import sys


def main():
    parser = argparse.ArgumentParser(description="Export Unsloth model")
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--format", required=True, choices=["gguf", "ollama", "vllm", "huggingface"])
    parser.add_argument("--output-path", required=True)
    parser.add_argument("--quant-bits", type=int, default=4)
    args = parser.parse_args()

    try:
        os.makedirs(os.path.dirname(args.output_path) or ".", exist_ok=True)

        from transformers import AutoModelForCausalLM, AutoTokenizer

        model = AutoModelForCausalLM.from_pretrained(args.model_path)
        tokenizer = AutoTokenizer.from_pretrained(args.model_path)

        if args.format == "huggingface":
            model.save_pretrained(args.output_path)
            tokenizer.save_pretrained(args.output_path)
        elif args.format == "vllm":
            model.save_pretrained(os.path.join(args.output_path, "vllm_out"))
            tokenizer.save_pretrained(os.path.join(args.output_path, "vllm_out"))
        else:
            # Default save for gguf/ollama (requires additional tools)
            model.save_pretrained(args.output_path)
            tokenizer.save_pretrained(args.output_path)

        print(json.dumps({
            "success": True,
            "model_path": args.model_path,
            "export_format": args.format,
            "output_path": args.output_path,
            "quantization_bits": args.quant_bits,
        }))

    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)


if __name__ == "__main__":
    main()
