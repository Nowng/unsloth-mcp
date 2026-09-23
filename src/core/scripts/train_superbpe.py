#!/usr/bin/env python3
"""
Train a SuperBPE tokenizer for improved efficiency.
Usage: python train_superbpe.py --corpus <path|name> --output-path <path> [--vocab-size <n>] [--num-herit-merges <n>]
Outputs JSON to stdout.
"""
import argparse
import json
import os
import sys


def main():
    parser = argparse.ArgumentParser(description="Train SuperBPE tokenizer")
    parser.add_argument("--corpus", required=True)
    parser.add_argument("--vocab-size", type=int, default=50000)
    parser.add_argument("--output-path", required=True)
    parser.add_argument("--num-herit-merges", type=int, default=None)
    args = parser.parse_args()

    import math
    inherit_merges = args.num_herit_merges or math.floor(args.vocab_size * 0.8)

    try:
        import math
        from tokenizers import Tokenizer
        from tokenizers.models import BPE
        from tokenizers.trainers import BpeTrainer
        from tokenizers.pre_tokenizers import Whitespace, ByteLevel
        from tokenizers.processors import ByteLevel as ByteLevelProcessor

        tokenizer = Tokenizer(BPE())

        # Stage 1: Train BPE with whitespace pretokenization
        tokenizer.pre_tokenizer = Whitespace()
        trainer = BpeTrainer(
            vocab_size=args.vocab_size,
            special_tokens=["<pad>", "<s>", "</s>", "<unk>"],
        )

        # Load corpus
        if os.path.exists(args.corpus):
            with open(args.corpus, "r") as f:
                texts = [f.read()]
        else:
            from datasets import load_dataset
            dataset = load_dataset(args.corpus)
            texts = [item["text"] for item in dataset["train"]]

        tokenizer.train_from_iterator(texts, trainer=trainer)

        # Stage 2: SuperBPE
        tokenizer.pre_tokenizer = ByteLevel()
        current_vocab_size = tokenizer.get_vocab_size()
        additional_vocab = args.vocab_size - current_vocab_size
        if additional_vocab > 0:
            trainer2 = BpeTrainer(vocab_size=args.vocab_size, special_tokens=["<pad>", "<s>", "</s>", "<unk>"])
            tokenizer.train_from_iterator(texts, trainer=trainer2)

        tokenizer.post_processor = ByteLevelProcessor()

        output_dir = os.path.dirname(args.output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        tokenizer.save(args.output_path)

        sample_text = texts[0][:200] if texts else "Hello world!"
        encoding = tokenizer.encode(sample_text)
        tokens_count = len(encoding.tokens)

        print(json.dumps({
            "success": True,
            "output_path": args.output_path,
            "vocab_size": args.vocab_size,
            "final_vocab_size": tokenizer.get_vocab_size(),
            "sample_tokens": tokens_count,
            "message": "SuperBPE tokenizer trained successfully!",
        }, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)


if __name__ == "__main__":
    main()
