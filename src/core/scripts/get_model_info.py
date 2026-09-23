#!/usr/bin/env python3
"""
Get detailed information about a model.
Usage: python get_model_info.py --model-name <name>
Outputs JSON to stdout.
"""
import argparse
import json
import sys


def estimate_parameters(config):
    if hasattr(config, "num_parameters"):
        return config.num_parameters

    hidden_size = getattr(config, "hidden_size", 0)
    num_layers = getattr(config, "num_hidden_layers", 0)
    vocab = getattr(config, "vocab_size", 0)

    if hidden_size and num_layers and vocab:
        embedding_params = vocab * hidden_size
        layer_params = num_layers * (4 * hidden_size * hidden_size)
        return embedding_params + layer_params
    return "Unknown"


def main():
    parser = argparse.ArgumentParser(description="Get model info")
    parser.add_argument("--model-name", required=True)
    args = parser.parse_args()

    try:
        from transformers import AutoConfig, AutoTokenizer

        config = AutoConfig.from_pretrained(args.model_name)

        try:
            tokenizer = AutoTokenizer.from_pretrained(args.model_name)
            vocab_size = tokenizer.vocab_size
            model_max_length = tokenizer.model_max_length
        except Exception:
            vocab_size = getattr(config, "vocab_size", "Unknown")
            model_max_length = "Unknown"

        model_info = {
            "model_name": args.model_name,
            "architecture": config.architectures[0] if hasattr(config, "architectures") else config.model_type,
            "model_type": config.model_type,
            "hidden_size": getattr(config, "hidden_size", "Unknown"),
            "num_layers": getattr(config, "num_hidden_layers", "Unknown"),
            "num_attention_heads": getattr(config, "num_attention_heads", "Unknown"),
            "vocab_size": vocab_size,
            "max_position_embeddings": getattr(config, "max_position_embeddings", "Unknown"),
            "model_max_length": model_max_length,
            "estimated_parameters": estimate_parameters(config),
            "torch_dtype": str(getattr(config, "torch_dtype", "Unknown")),
            "success": True,
        }

        print(json.dumps(model_info, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)


if __name__ == "__main__":
    main()
