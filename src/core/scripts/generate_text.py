#!/usr/bin/env python3
"""
Generate text using a fine-tuned Unsloth model.
Usage: python generate_text.py --model-path <path> --prompt <prompt> [--max-new-tokens <n>] [--temperature <t>] [--top-p <p>]
Outputs JSON to stdout.
"""
import argparse
import json
import sys


def main():
    parser = argparse.ArgumentParser(description="Generate text with Unsloth model")
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--max-new-tokens", type=int, default=256)
    parser.add_argument("--temperature", type=float, default=0.7)
    parser.add_argument("--top-p", type=float, default=0.9)
    args = parser.parse_args()

    try:
        from unsloth import FastLanguageModel

        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=args.model_path,
            max_seq_length=2048,
            load_in_4bit=True,
        )
        FastLanguageModel.for_inference(model)

        inputs = tokenizer(args.prompt, return_tensors="pt").to(model.device)
        output = model.generate(
            **inputs,
            max_new_tokens=args.max_new_tokens,
            temperature=args.temperature,
            top_p=args.top_p,
            do_sample=True,
        )

        generated_text = tokenizer.decode(output[0], skip_special_tokens=True)

        result = {
            "prompt": args.prompt,
            "generated_text": generated_text,
            "success": True,
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)


if __name__ == "__main__":
    main()
