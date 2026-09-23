# Knowledge Capture PWA

A Progressive Web App for capturing book photos from your phone and building training datasets for fine-tuning AI models.

## Quick Start

### 1. Install Dependencies

```bash
cd pwa
npm install
```

### 2. Install OCR Backend

You need at least one OCR backend installed:

```bash
# Option A: Tesseract (fast, good for clear text)
pip install pytesseract
# Also install Tesseract itself:
# macOS: brew install tesseract
# Ubuntu: sudo apt install tesseract-ocr

# Option B: EasyOCR (better accuracy, slower)
pip install easyocr
```

### 3. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### 4. Open on Your Phone

1. Make sure your phone is on the same WiFi network as your computer
2. Find your computer's local IP address:
   - macOS: `ipconfig getifaddr en0`
   - Linux: `hostname -I`
   - Windows: `ipconfig` (look for IPv4)
3. Open `http://<your-ip>:3000` on your phone's browser
4. Add to home screen for app-like experience

## Features

### Capture

- Take photos of book pages directly from your phone
- Automatic OCR text extraction
- Auto-classification into trading/finance categories
- Topic detection

### Library

- Browse all captured entries
- Filter by category
- View full text and metadata
- Generate training pairs per entry

### Export

- Export training data in multiple formats:
  - **Alpaca**: Standard instruction format
  - **ShareGPT**: Conversation format
  - **ChatML**: OpenAI-style format

## API Endpoints

| Endpoint                    | Method | Description                  |
| --------------------------- | ------ | ---------------------------- |
| `/api/health`               | GET    | Health check                 |
| `/api/ocr/backends`         | GET    | Check available OCR backends |
| `/api/categories`           | GET    | List all categories          |
| `/api/capture`              | POST   | Upload and process image     |
| `/api/entries`              | GET    | List all entries             |
| `/api/entries/:id`          | GET    | Get single entry             |
| `/api/entries/:id/generate` | POST   | Generate training pairs      |
| `/api/stats`                | GET    | Get statistics               |
| `/api/export?format=alpaca` | GET    | Export training data         |

## Workflow

1. **Capture**: Take a photo of a book page
2. **Tag**: Add book title, author, chapter (optional)
3. **Process**: OCR extracts text and auto-classifies
4. **Review**: Check the extracted content in Library
5. **Generate**: Create training pairs from entries
6. **Export**: Download training data
7. **Train**: Use with Unsloth MCP server to fine-tune

## Categories

The app auto-classifies content into:

- Candlestick Patterns
- Chart Patterns
- Technical Indicators
- Risk Management
- Trading Psychology
- Market Structure
- Options Strategies
- Fundamental Analysis
- Order Flow
- Volume Analysis
- General

## Tips

- Use good lighting when taking photos
- Capture one concept per photo for best results
- Add meaningful tags for better organization
- Review OCR output for accuracy
- Generate multiple training pairs per entry

## Development

```bash
# Run with auto-reload
npm run dev
```

## Troubleshooting

### "No OCR backend available"

Install pytesseract or easyocr:

```bash
pip install pytesseract
# or
pip install easyocr
```

### Camera not working

- Make sure you're accessing via HTTPS or localhost
- Grant camera permissions when prompted
- Try refreshing the page

### Low OCR quality

- Improve lighting
- Hold camera steady
- Ensure text is in focus
- Use higher resolution camera settings
