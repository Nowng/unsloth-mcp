/**
 * Knowledge Capture PWA Server
 *
 * REST API that wraps the knowledge base tools for the PWA frontend
 */

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  }
});

// Database path
const DB_PATH = path.join(__dirname, '../../data/knowledge.db');
const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================================
// Helper Functions
// ============================================================================

async function runPythonScript(script) {
  try {
    const { stdout, stderr } = await execPromise(`python3 -c '${script}'`, {
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024
    });
    return stdout.trim();
  } catch (error) {
    console.error('Python script error:', error.message);
    throw error;
  }
}

async function initDatabase() {
  const schema = `
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  source_type TEXT NOT NULL,
  source_book_title TEXT,
  source_author TEXT,
  source_chapter TEXT,
  source_page_numbers TEXT,
  source_image_path TEXT NOT NULL,
  source_capture_date TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  cleaned_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  quality_score REAL DEFAULT 0,
  ocr_confidence REAL DEFAULT 0,
  manually_reviewed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS entry_topics (
  entry_id TEXT NOT NULL,
  topic_id INTEGER NOT NULL,
  PRIMARY KEY (entry_id, topic_id)
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (entry_id, tag_id)
);

CREATE TABLE IF NOT EXISTS training_pairs (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  type TEXT NOT NULL,
  instruction TEXT,
  input TEXT,
  output TEXT NOT NULL,
  system_prompt TEXT,
  quality_score REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

  const script = `
import sqlite3
conn = sqlite3.connect("${DB_PATH}")
cursor = conn.cursor()
for stmt in """${schema}""".split(';'):
    stmt = stmt.strip()
    if stmt:
        try:
            cursor.execute(stmt)
        except Exception as e:
            pass
conn.commit()
conn.close()
print('{"success": true}')
`;

  await runPythonScript(script);
}

// Initialize database on startup
initDatabase().catch(console.error);

// ============================================================================
// API Routes
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Check available OCR backends
app.get('/api/ocr/backends', async (req, res) => {
  try {
    const script = `
import json
backends = {"tesseract": False, "easyocr": False, "claude": False}

try:
    import pytesseract
    pytesseract.get_tesseract_version()
    backends["tesseract"] = True
except:
    pass

try:
    import easyocr
    backends["easyocr"] = True
except:
    pass

import os
if os.environ.get("ANTHROPIC_API_KEY"):
    backends["claude"] = True

print(json.dumps(backends))
`;
    const result = await runPythonScript(script);
    res.json(JSON.parse(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get categories
app.get('/api/categories', (req, res) => {
  const categories = [
    { id: 'candlestick_patterns', name: 'Candlestick Patterns', description: 'Japanese candlestick patterns' },
    { id: 'chart_patterns', name: 'Chart Patterns', description: 'Technical chart patterns' },
    { id: 'technical_indicators', name: 'Technical Indicators', description: 'RSI, MACD, etc.' },
    { id: 'risk_management', name: 'Risk Management', description: 'Position sizing, stop losses' },
    { id: 'trading_psychology', name: 'Trading Psychology', description: 'Mental aspects of trading' },
    { id: 'market_structure', name: 'Market Structure', description: 'Trends, support/resistance' },
    { id: 'options_strategies', name: 'Options Strategies', description: 'Options trading strategies' },
    { id: 'fundamental_analysis', name: 'Fundamental Analysis', description: 'Company/economic analysis' },
    { id: 'order_flow', name: 'Order Flow', description: 'Order book, tape reading' },
    { id: 'volume_analysis', name: 'Volume Analysis', description: 'Volume-based analysis' },
    { id: 'general', name: 'General', description: 'General trading knowledge' }
  ];
  res.json(categories);
});

// Upload and process image
app.post('/api/capture', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const {
    book_title = '',
    author = '',
    chapter = '',
    page_numbers = '',
    category = 'general',
    tags = ''
  } = req.body;

  const imagePath = req.file.path;
  const entryId = `ke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // OCR the image
    const ocrScript = `
import json
import re

# Try different OCR backends
ocr_result = None
backend_used = None
confidence = 0

# Try Tesseract first
try:
    import pytesseract
    from PIL import Image, ImageEnhance, ImageFilter

    image = Image.open("${imagePath.replace(/\\/g, '\\\\')}")

    # Enhance image
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.5)
    image = image.filter(ImageFilter.SHARPEN)

    # OCR
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

    texts = []
    confidences = []
    for i, text in enumerate(data['text']):
        if text.strip():
            conf = data['conf'][i]
            if conf > 0:
                texts.append(text)
                confidences.append(conf)

    raw_text = pytesseract.image_to_string(image)
    confidence = sum(confidences) / len(confidences) if confidences else 0
    backend_used = "tesseract"
    ocr_result = raw_text
except Exception as e:
    pass

# Try EasyOCR if Tesseract failed
if not ocr_result:
    try:
        import easyocr
        reader = easyocr.Reader(['en'], gpu=False)
        results = reader.readtext("${imagePath.replace(/\\/g, '\\\\')}")

        texts = [r[1] for r in results]
        confidences = [r[2] for r in results]

        ocr_result = ' '.join(texts)
        confidence = (sum(confidences) / len(confidences) * 100) if confidences else 0
        backend_used = "easyocr"
    except Exception as e:
        pass

if not ocr_result:
    print(json.dumps({"error": "No OCR backend available"}))
else:
    # Clean text
    cleaned = ocr_result
    cleaned = re.sub(r'\\n{3,}', '\\n\\n', cleaned)
    cleaned = re.sub(r' {2,}', ' ', cleaned)
    cleaned = cleaned.strip()

    # Auto-classify
    text_lower = cleaned.lower()

    keywords = {
        "candlestick_patterns": ["doji", "hammer", "engulfing", "harami", "shooting star", "morning star"],
        "chart_patterns": ["head and shoulders", "double top", "triangle", "wedge", "flag", "cup and handle"],
        "technical_indicators": ["rsi", "macd", "moving average", "bollinger", "stochastic"],
        "risk_management": ["stop loss", "position size", "risk reward", "drawdown"],
        "trading_psychology": ["fear", "greed", "discipline", "fomo", "emotion"],
        "market_structure": ["support", "resistance", "trend", "breakout"],
        "options_strategies": ["call", "put", "spread", "iron condor", "theta", "delta"],
        "volume_analysis": ["volume", "vwap", "obv"]
    }

    detected_category = "general"
    detected_topics = []
    max_score = 0

    for cat, kws in keywords.items():
        score = sum(1 for kw in kws if kw in text_lower)
        if score > max_score:
            max_score = score
            detected_category = cat
        detected_topics.extend([kw for kw in kws if kw in text_lower])

    print(json.dumps({
        "success": True,
        "raw_text": ocr_result,
        "cleaned_text": cleaned,
        "confidence": round(confidence, 2),
        "backend": backend_used,
        "detected_category": detected_category,
        "detected_topics": list(set(detected_topics))[:10]
    }))
`;

    const ocrResultStr = await runPythonScript(ocrScript);
    const ocrResult = JSON.parse(ocrResultStr);

    if (ocrResult.error) {
      return res.status(500).json({ error: ocrResult.error });
    }

    // Use provided category or detected one
    const finalCategory = category !== 'general' ? category : ocrResult.detected_category;
    const tagList = tags ? tags.split(',').map(t => t.trim()) : [];

    // Save to database
    const saveScript = `
import sqlite3
import json

conn = sqlite3.connect("${DB_PATH}")
cursor = conn.cursor()

try:
    cursor.execute('''
        INSERT INTO knowledge_entries (
            id, source_type, source_book_title, source_author, source_chapter,
            source_page_numbers, source_image_path, source_capture_date,
            raw_text, cleaned_text, category, quality_score, ocr_confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?)
    ''', (
        "${entryId}",
        "book",
        ${book_title ? `"${book_title.replace(/"/g, '\\"')}"` : 'None'},
        ${author ? `"${author.replace(/"/g, '\\"')}"` : 'None'},
        ${chapter ? `"${chapter.replace(/"/g, '\\"')}"` : 'None'},
        ${page_numbers ? `"${page_numbers}"` : 'None'},
        "${imagePath.replace(/\\/g, '\\\\')}",
        """${ocrResult.raw_text.replace(/"""/g, '\\"\\"\\"').replace(/\\/g, '\\\\')}""",
        """${ocrResult.cleaned_text.replace(/"""/g, '\\"\\"\\"').replace(/\\/g, '\\\\')}""",
        "${finalCategory}",
        ${ocrResult.confidence},
        ${ocrResult.confidence}
    ))

    # Add topics
    for topic in ${JSON.stringify(ocrResult.detected_topics)}:
        cursor.execute('INSERT OR IGNORE INTO topics (name) VALUES (?)', (topic,))
        cursor.execute('SELECT id FROM topics WHERE name = ?', (topic,))
        topic_id = cursor.fetchone()[0]
        cursor.execute('INSERT OR IGNORE INTO entry_topics (entry_id, topic_id) VALUES (?, ?)', ("${entryId}", topic_id))

    # Add tags
    for tag in ${JSON.stringify(tagList)}:
        cursor.execute('INSERT OR IGNORE INTO tags (name) VALUES (?)', (tag,))
        cursor.execute('SELECT id FROM tags WHERE name = ?', (tag,))
        tag_id = cursor.fetchone()[0]
        cursor.execute('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)', ("${entryId}", tag_id))

    conn.commit()
    print(json.dumps({"success": True}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
finally:
    conn.close()
`;

    await runPythonScript(saveScript);

    res.json({
      success: true,
      entry_id: entryId,
      ocr_backend: ocrResult.backend,
      ocr_confidence: ocrResult.confidence,
      category: finalCategory,
      detected_topics: ocrResult.detected_topics,
      text_preview: ocrResult.cleaned_text.substring(0, 200) + '...'
    });

  } catch (error) {
    console.error('Capture error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all entries
app.get('/api/entries', async (req, res) => {
  const { category, limit = 50 } = req.query;

  try {
    const whereClause = category ? `WHERE category = "${category}"` : '';
    const script = `
import sqlite3
import json

conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute('''
    SELECT id, created_at, source_book_title, source_chapter, source_page_numbers,
           category, quality_score, substr(cleaned_text, 1, 150) as preview
    FROM knowledge_entries
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ${limit}
''')

entries = [dict(row) for row in cursor.fetchall()]
conn.close()

print(json.dumps({"entries": entries}))
`;
    const result = await runPythonScript(script);
    res.json(JSON.parse(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single entry
app.get('/api/entries/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const script = `
import sqlite3
import json

conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute('SELECT * FROM knowledge_entries WHERE id = ?', ("${id}",))
row = cursor.fetchone()

if not row:
    print(json.dumps({"error": "Entry not found"}))
else:
    entry = dict(row)

    # Get topics
    cursor.execute('''
        SELECT t.name FROM topics t
        JOIN entry_topics et ON t.id = et.topic_id
        WHERE et.entry_id = ?
    ''', ("${id}",))
    entry["topics"] = [r[0] for r in cursor.fetchall()]

    # Get tags
    cursor.execute('''
        SELECT t.name FROM tags t
        JOIN entry_tags et ON t.id = et.tag_id
        WHERE et.entry_id = ?
    ''', ("${id}",))
    entry["tags"] = [r[0] for r in cursor.fetchall()]

    print(json.dumps({"entry": entry}))

conn.close()
`;
    const result = await runPythonScript(script);
    const data = JSON.parse(result);

    if (data.error) {
      return res.status(404).json(data);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stats (enhanced for dashboard)
app.get('/api/stats', async (req, res) => {
  try {
    const script = `
import sqlite3
import json

conn = sqlite3.connect("${DB_PATH}")
cursor = conn.cursor()

# Total entries
cursor.execute('SELECT COUNT(*) FROM knowledge_entries')
total = cursor.fetchone()[0]

# By category
cursor.execute('SELECT category, COUNT(*) FROM knowledge_entries GROUP BY category')
by_category = {row[0]: row[1] for row in cursor.fetchall()}

# Training pairs
cursor.execute('SELECT COUNT(*) FROM training_pairs')
total_pairs = cursor.fetchone()[0]

# Average quality scores
cursor.execute('SELECT AVG(quality_score) FROM knowledge_entries')
avg_entry_quality = cursor.fetchone()[0] or 0

cursor.execute('SELECT AVG(quality_score) FROM training_pairs')
avg_pair_quality = cursor.fetchone()[0] or 0

# Quality distribution
cursor.execute('''
    SELECT
        SUM(CASE WHEN quality_score >= 80 THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN quality_score >= 60 AND quality_score < 80 THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN quality_score < 60 THEN 1 ELSE 0 END) as low
    FROM training_pairs
''')
quality_dist = cursor.fetchone()

# Recent activity count (last 7 days)
cursor.execute('''
    SELECT COUNT(*) FROM knowledge_entries
    WHERE created_at >= datetime('now', '-7 days')
''')
recent_entries = cursor.fetchone()[0]

# By source type
cursor.execute('SELECT source_type, COUNT(*) FROM knowledge_entries GROUP BY source_type')
by_source = {row[0]: row[1] for row in cursor.fetchall()}

conn.close()

print(json.dumps({
    "total_entries": total,
    "total_pairs": total_pairs,
    "by_category": by_category,
    "by_source": by_source,
    "average_quality": round(avg_pair_quality if avg_pair_quality else avg_entry_quality, 1),
    "quality_distribution": {
        "high": quality_dist[0] or 0,
        "medium": quality_dist[1] or 0,
        "low": quality_dist[2] or 0
    },
    "recent_entries": recent_entries,
    "entries_by_category": by_category,
    "avg_quality_score": round(avg_entry_quality, 2)
}))
`;
    const result = await runPythonScript(script);
    res.json(JSON.parse(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate training pairs for an entry
app.post('/api/entries/:id/generate', async (req, res) => {
  const { id } = req.params;
  const { pairs_count = 3 } = req.body;

  try {
    const script = `
import sqlite3
import json
import re

conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute('SELECT * FROM knowledge_entries WHERE id = ?', ("${id}",))
row = cursor.fetchone()

if not row:
    print(json.dumps({"error": "Entry not found"}))
else:
    entry = dict(row)
    content = entry["cleaned_text"]
    category = entry["category"]

    # Get topics
    cursor.execute('''
        SELECT t.name FROM topics t
        JOIN entry_topics et ON t.id = et.topic_id
        WHERE et.entry_id = ?
    ''', ("${id}",))
    topics = [r[0] for r in cursor.fetchall()]

    # Generate Q&A pairs
    pairs = []
    sentences = [s.strip() for s in re.split(r'[.!?]+', content) if len(s.strip()) > 20]

    templates = {
        "candlestick_patterns": [
            "What is a {topic} candlestick pattern?",
            "How do I identify a {topic} pattern?",
            "What does {topic} indicate about market sentiment?"
        ],
        "chart_patterns": [
            "How do I identify a {topic} chart pattern?",
            "What is the typical price target for a {topic}?",
            "How should I trade a {topic} pattern?"
        ],
        "default": [
            "Explain {topic} in trading.",
            "What should I know about {topic}?",
            "How does {topic} apply to trading?"
        ]
    }

    template_list = templates.get(category, templates["default"])

    for i in range(min(${pairs_count}, len(template_list))):
        topic = topics[i % len(topics)] if topics else "this concept"
        question = template_list[i].replace("{topic}", topic)

        # Find relevant sentences
        relevant = [s for s in sentences if topic.lower() in s.lower()]
        answer = '. '.join(relevant[:3]) if relevant else '. '.join(sentences[:3])
        if answer and not answer.endswith('.'):
            answer += '.'

        pair_id = f"tp_{int(__import__('time').time())}_{i}"

        cursor.execute('''
            INSERT INTO training_pairs (id, entry_id, type, instruction, input, output, quality_score)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (pair_id, "${id}", "qa", question, "", answer, 70))

        pairs.append({
            "id": pair_id,
            "type": "qa",
            "instruction": question,
            "output": answer[:200] + "..." if len(answer) > 200 else answer
        })

    conn.commit()
    conn.close()

    print(json.dumps({"success": True, "pairs": pairs}))
`;
    const result = await runPythonScript(script);
    res.json(JSON.parse(result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export training data
app.get('/api/export', async (req, res) => {
  const { format = 'alpaca', min_quality = 0 } = req.query;

  try {
    const script = `
import sqlite3
import json

conn = sqlite3.connect("${DB_PATH}")
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute('''
    SELECT * FROM training_pairs
    WHERE quality_score >= ${min_quality}
    ORDER BY quality_score DESC
''')

pairs = []
for row in cursor.fetchall():
    pair = dict(row)

    if "${format}" == "alpaca":
        pairs.append({
            "instruction": pair["instruction"] or "Explain this trading concept.",
            "input": pair["input"] or "",
            "output": pair["output"]
        })
    elif "${format}" == "sharegpt":
        conv = []
        if pair.get("system_prompt"):
            conv.append({"from": "system", "value": pair["system_prompt"]})
        if pair["instruction"]:
            conv.append({"from": "human", "value": pair["instruction"]})
        conv.append({"from": "gpt", "value": pair["output"]})
        pairs.append({"conversations": conv})
    elif "${format}" == "chatml":
        msgs = []
        if pair.get("system_prompt"):
            msgs.append({"role": "system", "content": pair["system_prompt"]})
        if pair["instruction"]:
            msgs.append({"role": "user", "content": pair["instruction"]})
        msgs.append({"role": "assistant", "content": pair["output"]})
        pairs.append({"messages": msgs})

conn.close()
print(json.dumps(pairs))
`;
    const result = await runPythonScript(script);
    const data = JSON.parse(result);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=training_data_${format}.json`);
    res.send(JSON.stringify(data, null, 2));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve PWA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         Knowledge Capture PWA Server v1.0.0                ║
╠════════════════════════════════════════════════════════════╣
║  Local:   http://localhost:${PORT}                            ║
║  Network: http://<your-ip>:${PORT}                            ║
╠════════════════════════════════════════════════════════════╣
║  Open on your phone to capture book photos!                ║
╚════════════════════════════════════════════════════════════╝
  `);
});
