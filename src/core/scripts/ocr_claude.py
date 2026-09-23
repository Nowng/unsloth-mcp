#!/usr/bin/env python3
"""
OCR processing using Claude Vision API.
Usage: python ocr_claude.py --image <path> [--api-key <key>]
Outputs JSON to stdout.
"""
import argparse
import base64
import json
import sys


def process(image_path, api_key):
    import anthropic

    with open(image_path, "rb") as f:
        image_data = f.read()
    base64_image = base64.b64encode(image_data).decode("utf-8")

    # Determine media type
    import os
    ext = os.path.splitext(image_path)[1].lower()
    media_type = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }.get(ext, "image/jpeg")

    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": base64_image,
                        },
                    },
                    {
                        "type": "text",
                        "text": """Extract ALL text from this image. This appears to be from a trading/finance book.

Instructions:
1. Extract every word, number, and symbol visible
2. Preserve the structure and formatting as much as possible
3. If there are charts or diagrams, describe what they show
4. For candlestick patterns or charts, describe the pattern name and key features
5. Include any captions, labels, or annotations

Return the extracted text in a clean, readable format.""",
                    },
                ],
            },
        ],
    )

    extracted_text = message.content[0].text

    return {
        "raw_text": extracted_text,
        "cleaned_text": extracted_text,
        "confidence": 95.0,
        "success": True,
    }


def main():
    parser = argparse.ArgumentParser(description="Claude Vision OCR")
    parser.add_argument("--image", required=True)
    parser.add_argument("--api-key", required=True)
    args = parser.parse_args()

    try:
        result = process(args.image, args.api_key)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
