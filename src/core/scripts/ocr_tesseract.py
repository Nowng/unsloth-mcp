#!/usr/bin/env python3
"""
OCR processing using Tesseract.
Usage: python ocr_tesseract.py --image <path> [--language eng] [--enhance <bool>] [--preserve-layout <bool>] [--check-backend]
Outputs JSON to stdout.
"""
import argparse
import json
import re
import sys


def check_backend():
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        print(json.dumps({"success": True, "message": "tesseract available"}))
        return True
    except Exception:
        print(json.dumps({"success": False, "error": "tesseract not available"}))
        return False


def process(image_path, language, enhance, preserve_layout):
    import pytesseract
    from PIL import Image

    image = Image.open(image_path)

    if enhance:
        from PIL import ImageEnhance, ImageFilter
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)
        image = image.filter(ImageFilter.SHARPEN)

    config = "--oem 3"
    psm = 6 if preserve_layout else 3
    config = f"--oem 3 --psm {psm}"

    data = pytesseract.image_to_data(
        image, lang=language, config=config,
        output_type=pytesseract.Output.DICT,
    )

    texts = []
    confidences = []
    boxes = []

    for i, text in enumerate(data["text"]):
        if text.strip():
            conf = data["conf"][i]
            if conf > 0:
                texts.append(text)
                confidences.append(conf)
                boxes.append({
                    "text": text,
                    "x": data["left"][i],
                    "y": data["top"][i],
                    "width": data["width"][i],
                    "height": data["height"][i],
                    "confidence": conf,
                })

    raw_text = pytesseract.image_to_string(image, lang=language, config=config)

    cleaned = raw_text
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r" {2,}", " ", cleaned)
    cleaned = cleaned.strip()

    avg_confidence = sum(confidences) / len(confidences) if confidences else 0

    return {
        "raw_text": raw_text,
        "cleaned_text": cleaned,
        "confidence": round(avg_confidence, 2),
        "bounding_boxes": boxes[:50],
    }


def main():
    parser = argparse.ArgumentParser(description="Tesseract OCR")
    parser.add_argument("--image", default=None)
    parser.add_argument("--language", default="eng")
    parser.add_argument("--enhance", type=str, default="true")
    parser.add_argument("--preserve-layout", type=str, default="true")
    parser.add_argument("--check-backend", action="store_true")
    args = parser.parse_args()

    if args.check_backend:
        check_backend()
        return

    try:
        result = process(
            args.image,
            args.language,
            args.enhance.lower() == "true",
            args.preserve_layout.lower() == "true",
        )
        result["success"] = True
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
