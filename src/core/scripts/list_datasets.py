#!/usr/bin/env python3
"""
List popular datasets available for fine-tuning from Hugging Face.
Usage: python list_datasets.py [--search <query>] [--limit <n>]
Outputs JSON to stdout.
"""
import argparse
import json
import sys


def main():
    parser = argparse.ArgumentParser(description="List HF datasets")
    parser.add_argument("--search", default="")
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()

    try:
        from huggingface_hub import list_datasets

        datasets = list_datasets(
            search=args.search,
            limit=args.limit,
            sort="downloads",
            direction=-1,
        )

        dataset_list = []
        for dataset in datasets:
            dataset_list.append({
                "id": dataset.id,
                "author": getattr(dataset, "author", "Unknown"),
                "downloads": getattr(dataset, "downloads", 0),
                "likes": getattr(dataset, "likes", 0),
                "tags": dataset.tags[:5] if hasattr(dataset, "tags") else [],
            })

        result = {
            "query": args.search,
            "count": len(dataset_list),
            "datasets": dataset_list,
            "success": True,
        }

        print(json.dumps(result, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)


if __name__ == "__main__":
    main()
