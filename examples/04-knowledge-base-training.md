# Knowledge Base Training Pipeline

This guide shows how to build a custom training dataset from your own books and documents using the knowledge base tools.

## Overview

The knowledge base pipeline enables you to:

1. **Capture** - Take photos of book pages with your phone
2. **OCR** - Extract text using multiple OCR backends (Tesseract, EasyOCR, Claude Vision)
3. **Catalogue** - Organize content by category, topic, and source
4. **Generate** - Create instruction-tuning training pairs
5. **Export** - Export data in Alpaca, ShareGPT, or ChatML formats
6. **Train** - Fine-tune models on your custom knowledge

## Quick Start

### Step 1: Check Available OCR Backends

```
Tool: check_ocr_backends
Arguments: {}
```

This shows which OCR engines are available:

- **tesseract** - Fast, good for clear printed text
- **easyocr** - Better accuracy, handles mixed content
- **claude** - Best for charts/diagrams (requires API key)

### Step 2: Process a Book Image

```
Tool: process_book_image
Arguments: {
  "image_path": "/path/to/book_page.jpg",
  "book_title": "Japanese Candlestick Charting Techniques",
  "author": "Steve Nison",
  "chapter": "Chapter 5 - Reversal Patterns",
  "page_numbers": "85-86",
  "category": "candlestick_patterns",
  "tags": ["reversal", "bullish", "hammer"]
}
```

The system will:

1. OCR the image to extract text
2. Auto-classify content if no category provided
3. Detect relevant topics (e.g., "hammer", "engulfing")
4. Store in the knowledge base with metadata

### Step 3: Batch Process Multiple Images

For processing multiple pages at once:

```
Tool: batch_process_images
Arguments: {
  "image_paths": [
    "/photos/page1.jpg",
    "/photos/page2.jpg",
    "/photos/page3.jpg"
  ],
  "book_title": "Technical Analysis of the Financial Markets",
  "author": "John Murphy",
  "category": "chart_patterns"
}
```

### Step 4: Search Your Knowledge Base

```
Tool: search_knowledge
Arguments: {
  "query": "hammer candlestick reversal",
  "limit": 10
}
```

### Step 5: Browse by Category

```
Tool: list_knowledge_by_category
Arguments: {
  "category": "candlestick_patterns",
  "limit": 50
}
```

### Step 6: Generate Training Data

Generate instruction-tuning pairs from your knowledge:

```
Tool: generate_training_pairs
Arguments: {
  "min_quality_score": 50,
  "pairs_per_entry": 5,
  "include_system_prompt": true,
  "generate_synthetic": true
}
```

This creates Q&A pairs, instruction-following pairs, and conversation-style training data.

### Step 7: Export for Fine-Tuning

```
Tool: export_training_data
Arguments: {
  "output_path": "./training_data/finance_alpaca.json",
  "format": "alpaca",
  "min_quality_score": 40
}
```

Supported formats:

- **alpaca** - Standard instruction format: `{instruction, input, output}`
- **sharegpt** - Conversation format: `{conversations: [{from, value}]}`
- **chatml** - OpenAI style: `{messages: [{role, content}]}`

### Step 8: Fine-Tune Your Model

```
Tool: finetune_model
Arguments: {
  "model_name": "unsloth/Llama-3.2-3B-Instruct-bnb-4bit",
  "dataset_name": "./training_data/finance_alpaca.json",
  "output_dir": "./models/finance-expert",
  "max_steps": 500,
  "learning_rate": 2e-4
}
```

## Categories

The knowledge base supports these financial/trading categories:

| Category               | Description                   | Example Topics                    |
| ---------------------- | ----------------------------- | --------------------------------- |
| `candlestick_patterns` | Japanese candlestick patterns | doji, hammer, engulfing           |
| `chart_patterns`       | Technical chart patterns      | head and shoulders, triangles     |
| `technical_indicators` | Price/volume indicators       | RSI, MACD, moving averages        |
| `risk_management`      | Position sizing, stop losses  | 2% rule, risk-reward ratio        |
| `trading_psychology`   | Mental aspects of trading     | discipline, FOMO, revenge trading |
| `market_structure`     | Trends, support/resistance    | break of structure, ranges        |
| `options_strategies`   | Options trading strategies    | covered calls, iron condors       |
| `fundamental_analysis` | Company/economic analysis     | P/E ratio, earnings               |
| `order_flow`           | Order book, tape reading      | dark pools, imbalances            |
| `volume_analysis`      | Volume-based analysis         | VWAP, volume profile              |

## Training Data Format Examples

### Alpaca Format

```json
{
  "instruction": "What is a hammer candlestick pattern and how do I identify it?",
  "input": "",
  "output": "A hammer is a bullish reversal pattern that forms at the bottom of a downtrend. It has a small real body near the top of the trading range and a long lower shadow at least twice the length of the body. The long lower shadow shows that sellers pushed prices lower during the session, but buyers stepped in and pushed prices back up..."
}
```

### ShareGPT Format

```json
{
  "conversations": [
    { "from": "system", "value": "You are an expert trading educator..." },
    { "from": "human", "value": "What is a hammer candlestick pattern?" },
    { "from": "gpt", "value": "A hammer is a bullish reversal pattern..." }
  ]
}
```

### ChatML Format

```json
{
  "messages": [
    { "role": "system", "content": "You are an expert trading educator..." },
    { "role": "user", "content": "What is a hammer candlestick pattern?" },
    { "role": "assistant", "content": "A hammer is a bullish reversal pattern..." }
  ]
}
```

## Workflow Tips

### 1. Quality Over Quantity

- Focus on clear, informative pages
- Skip pages with complex diagrams (unless using Claude Vision)
- Review OCR results and correct major errors

### 2. Organize by Topic

- Use consistent categories across similar content
- Add meaningful tags for better searchability
- Include chapter/page info for reference

### 3. Generate Diverse Training Data

- Use different `pairs_per_entry` values
- Enable `generate_synthetic` for AI-enhanced pairs
- Set appropriate `min_quality_score` thresholds

### 4. Iterate and Improve

- Start with a small batch (10-20 pages)
- Test the fine-tuned model
- Add more data based on gaps in knowledge

## Complete Pipeline Example

```bash
# 1. Set up OCR (install one of these)
pip install pytesseract  # Fast, requires Tesseract
pip install easyocr      # Better accuracy

# 2. Process your book images
# (use the process_book_image tool for each image)

# 3. Generate training data
# (use generate_training_pairs tool)

# 4. Export to Alpaca format
# (use export_training_data tool)

# 5. Fine-tune the model
# (use finetune_model tool)

# 6. Export to Ollama
# (use export_model tool with format="gguf")

# 7. Run locally
ollama run ./models/finance-expert
```

## Troubleshooting

### OCR Quality Issues

- Use `enhance_image: true` for better results
- Try different backends (easyocr for mixed content)
- Use Claude Vision for charts and diagrams

### Low Training Pair Quality

- Increase `min_quality_score` threshold
- Review source content quality
- Add more context in manual entries

### Model Not Learning

- Increase training steps
- Verify dataset format
- Check for data quality issues
