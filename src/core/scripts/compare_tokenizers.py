#!/usr/bin/env python3
"""
Compare tokenization efficiency between different tokenizers.
Usage: python compare_tokenizers.py --text <text> --tokenizer1 <path> --tokenizer2 <path>
Outputs JSON to stdout.
"""
import argparse
import json
import sys


def main():
    parser = argparse.ArgumentParser(description="Compare tokenizers")
    parser.add_argument("--text", required=True)
    parser.add_argument("--tokenizer1", required=True)
    parser.add_argument("--tokenizer2", required=True)
    args = parser.parse_args()

    try:
        from transformers import AutoTokenizer
        from tokenizers import Tokenizer

        def load_tokenizer(path):
            try:
                return AutoTokenizer.from_pretrained(path)
            except Exception:
                return Tokenizer.from_file(path)

        tokenizer1 = load_tokenizer(args.tokenizer1)
        tokenizer2 = load_tokenizer(args.tokenizer2)

        tokens1 = tokenizer1.encode(args.text)
        tokens2 = tokenizer2.encode(args.text)

        count1 = len(tokens1) if hasattr(tokens1, "__len__") else len(tokens1.ids)
        count2 = len(tokens2) if hasattr(tokens2, "__len__") else len(tokens2.ids)

        efficiency_gain = ((count1 - count2) / count1 * 100) if count1 > 0 else 0

        comparison = {
            "tokenizer1_path": args.tokenizer1,
            "tokenizer2_path": args.tokenizer2,
            "tokenizer1_count": count1,
            "tokenizer2_count": count2,
            "difference": count1 - count2,
            "efficiency_gain_percent": round(efficiency_gain, 2),
            "text_length": len(args.text),
            "winner": "tokenizer2" if count2 < count1 else "tokenizer1" if count1 < count2 else "tie",
            "success": True,
        }

        print(json.dumps(comparison, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)


if __name__ == "__main__":
    main()
