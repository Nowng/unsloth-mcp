#!/usr/bin/env python3
"""
Benchmark model inference speed and memory usage.
Usage: python benchmark_model.py --model-name <name> --prompt <prompt> [--iterations <n>] [--max-new-tokens <n>]
Outputs JSON to stdout.
"""
import argparse
import json
import os
import sys
import time


def main():
    parser = argparse.ArgumentParser(description="Benchmark model")
    parser.add_argument("--model-name", required=True)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--iterations", type=int, default=10)
    parser.add_argument("--max-new-tokens", type=int, default=128)
    args = parser.parse_args()

    try:
        import psutil
        from unsloth import FastLanguageModel

        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=args.model_name,
            max_seq_length=2048,
            load_in_4bit=True,
        )
        FastLanguageModel.for_inference(model)

        # Warm-up run
        inputs = tokenizer(args.prompt, return_tensors="pt").to(model.device)
        _ = model.generate(**inputs, max_new_tokens=10)

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024

        times = []
        tokens_per_second = []

        for i in range(args.iterations):
            inputs = tokenizer(args.prompt, return_tensors="pt").to(model.device)
            start_time = time.time()
            outputs = model.generate(**inputs, max_new_tokens=args.max_new_tokens)
            end_time = time.time()

            elapsed = end_time - start_time
            times.append(elapsed)
            tokens_per_second.append(args.max_new_tokens / elapsed)

        final_memory = process.memory_info().rss / 1024 / 1024

        benchmark_results = {
            "model_name": args.model_name,
            "num_iterations": args.iterations,
            "max_new_tokens": args.max_new_tokens,
            "avg_time_seconds": round(sum(times) / len(times), 3),
            "min_time_seconds": round(min(times), 3),
            "max_time_seconds": round(max(times), 3),
            "avg_tokens_per_second": round(sum(tokens_per_second) / len(tokens_per_second), 2),
            "memory_used_mb": round(final_memory - initial_memory, 2),
            "total_memory_mb": round(final_memory, 2),
            "success": True,
        }

        print(json.dumps(benchmark_results, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)


if __name__ == "__main__":
    main()
