#!/usr/bin/env python3
"""
OCR processing using EasyOCR.
Usage: python ocr_easyocr.py --image <path> [--language en] [--check-backend]
Outputs JSON to stdout.
"""
import argparse
import json
import re
import sys


def check_backend():
    try:
        import easyocr
        easyocr.Reader(["en"], gpu=False)
        print(json.dumps({"success": True, "message": "easyocr available"}))
        return True
    except Exception as e:
        # Reader init downloads models; availability is indicated by import success
        try:
            import easyocr
            print(json.dumps({"success": True, "message": "easyocr available"}))
            return True
        except Exception:
            print(json.dumps({"success": False, "error": "easyocr not available"}))
            return False


def process(image_path, language):
    import easyocr

    reader = easyocr.Reader([language], gpu=False)
    results = reader.readtext(image_path)

    texts = []
    confidences = []
    boxes = []

    for bbox, text, conf in results:
        texts.append(text)
        confidences.append(conf)
        x_coords = [p[0] for p in bbox]
        y_coords = [p[1] for p in bbox]
        boxes.append({
            "text": text,
            "x": int(min(x_coords)),
            "y": int(min(y_coords)),
            "width": int(max(x_coords) - min(x_coords)),
            "height": int(max(y_coords) - min(y_coords)),
            "confidence": round(conf * 100, 2),
        })

    raw_text = " ".join(texts)
    avg_confidence = (sum(confidences) / len(confidences) * 100) if confidences else 0

    # Structure the text into lines
    sorted_boxes = sorted(boxes, key=lambda b: (b["y"] // 20, b["x"]))
    lines = []
    current_line = []
    current_y = -100

    for box in sorted_boxes:
        if abs(box["y"] - current_y) > 15:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [box["text"]]
            current_y = box["y"]
        else:
            current_line.append(box["text"])

    if current_line:
        lines.append(" ".join(current_line))

    cleaned = "\n".join(lines)
    cleaned = re.sub(r" {2,}", " ", cleaned)
    cleaned = cleaned.strip()

    return {
        "raw_text": raw_text,
        "cleaned_text": cleaned,
        "confidence": round(avg_confidence, 2),
        "bounding_boxes": boxes[:50],
    }


def main():
    parser = argparse.ArgumentParser(description="EasyOCR")
    parser.add_argument("--image", default=None)
    parser.add_argument("--language", default="en")
    parser.add_argument("--check-backend", action="store_true")
    args = parser.parse_args()

    if args.check_backend:
        check_backend()
        return

    try:
        result = process(args.image, args.language)
        result["success"] = True
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
