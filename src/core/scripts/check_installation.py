#!/usr/bin/env python3
"""
Check Unsloth installation and environment.
Outputs JSON to stdout.
"""
import json
import sys

def main():
    result = {
        "unsloth_installed": False,
        "unsloth_version": None,
        "cuda_available": False,
        "torch_version": None,
        "transformers_version": None,
    }

    # Check unsloth
    try:
        import unsloth
        result["unsloth_installed"] = True
        result["unsloth_version"] = getattr(unsloth, "__version__", "unknown")
    except ImportError:
        print(json.dumps({"error": "unsloth not installed. Run: pip install unsloth"}))
        sys.exit(1)

    # Check torch and CUDA
    try:
        import torch
        result["torch_version"] = torch.__version__
        result["cuda_available"] = torch.cuda.is_available()
    except ImportError:
        print(json.dumps({"error": "torch not installed"}))
        sys.exit(1)

    # Check transformers
    try:
        import transformers
        result["transformers_version"] = transformers.__version__
    except ImportError:
        result["transformers_version"] = None

    print(json.dumps(result))

if __name__ == "__main__":
    main()
