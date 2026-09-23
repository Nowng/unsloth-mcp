#!/usr/bin/env python3
"""
Prepare and format a dataset for Unsloth fine-tuning.
Usage: python prepare_dataset.py --dataset <name|path> --output-path <path> [--text-field <field>] [--format <json|jsonl|csv>]
Outputs JSON to stdout.
"""
import argparse
import json
import os
import sys


def main():
    parser = argparse.ArgumentParser(description="Prepare dataset")
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--output-path", required=True)
    parser.add_argument("--text-field", default="text")
    parser.add_argument("--format", choices=["json", "jsonl", "csv"], default="jsonl")
    args = parser.parse_args()

    try:
        from datasets import load_dataset
        import pandas as pd

        dataset = load_dataset(args.dataset) if not os.path.exists(args.dataset) else load_dataset("json", data_files={"train": args.dataset})

        train_data = dataset["train"]

        output_dir = os.path.dirname(args.output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        if args.format == "jsonl":
            with open(args.output_path, "w") as f:
                for item in train_data:
                    if args.text_field in item:
                        f.write(json.dumps({"text": item[args.text_field]}) + "\n")
        elif args.format == "json":
            prepared_data = []
            for item in train_data:
                if args.text_field in item:
                    prepared_data.append({"text": item[args.text_field]})
            with open(args.output_path, "w") as f:
                json.dump(prepared_data, f, indent=2)
        elif args.format == "csv":
            df_data = []
            for item in train_data:
                if args.text_field in item:
                    df_data.append({"text": item[args.text_field]})
            df = pd.DataFrame(df_data)
            df.to_csv(args.output_path, index=False)

        result = {
            "dataset_name": args.dataset,
            "output_path": args.output_path,
            "format": args.format,
            "num_examples": len(train_data),
            "text_field": args.text_field,
            "success": True,
        }

        print(json.dumps(result, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)


if __name__ == "__main__":
    main()
