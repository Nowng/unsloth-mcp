/**
 * OCR Processing for Book Photos
 *
 * Uses the plugin's Python venv to execute OCR scripts.
 * Supports multiple backends: Tesseract, EasyOCR, Claude Vision.
 */

import fs from 'fs';
import { CATEGORY_DEFINITIONS } from './schema.js';
import type { Category } from './schema.js';
import { executeScript, executeScriptAndGetJson } from '../pythonExecutor.js';

export interface OCRResult {
  raw_text: string;
  cleaned_text: string;
  confidence: number;
  backend_used: string;
  processing_time_ms: number;
  detected_language?: string;
  bounding_boxes?: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
}

export interface OCROptions {
  backend?: 'auto' | 'tesseract' | 'easyocr' | 'claude';
  language?: string;
  enhance_image?: boolean;
  preserve_layout?: boolean;
  claude_api_key?: string;
  /** AbortSignal used to cancel OCR processing. */
  signal?: AbortSignal;
}

export interface BackendCheckOptions {
  signal?: AbortSignal;
}

// ============================================================================
// Backend Detection
// ============================================================================

export async function checkOCRBackends(
  options: BackendCheckOptions = {}
): Promise<{
  tesseract: boolean;
  easyocr: boolean;
  claude: boolean;
}> {
  const results = { tesseract: false, easyocr: false, claude: false };
  const { signal } = options;

  // Check Tesseract
  try {
    const result = await executeScript('ocr_tesseract.py', ['--check-backend'], { timeout: 15000, signal });
    results.tesseract = result.stdout.trim().includes('available');
  } catch {
    results.tesseract = false;
  }

  // Check EasyOCR
  try {
    const result = await executeScript('ocr_easyocr.py', ['--check-backend'], { timeout: 15000, signal });
    results.easyocr = result.stdout.trim().includes('available');
  } catch {
    results.easyocr = false;
  }

  // Check Claude Vision
  if (process.env.ANTHROPIC_API_KEY) {
    results.claude = true;
  }

  return results;
}

// ============================================================================
// Image Processing
// ============================================================================

export async function processImage(
  imagePath: string,
  options: OCROptions = {}
): Promise<OCRResult> {
  const startTime = Date.now();
  const { signal } = options;

  // Validate image exists
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }

  // Check available backends
  const backends = await checkOCRBackends({ signal });

  // Determine backend
  let backend = options.backend || 'auto';
  if (backend === 'auto') {
    if (backends.tesseract) {
      backend = 'tesseract';
    } else if (backends.easyocr) {
      backend = 'easyocr';
    } else if (backends.claude) {
      backend = 'claude';
    } else {
      throw new Error('No OCR backend available. Ensure pytesseract or easyocr is installed in the venv.');
    }
  }

  // Execute appropriate backend script
  let result: Record<string, unknown>;
  switch (backend) {
    case 'tesseract':
      result = await executeScriptAndGetJson('ocr_tesseract.py', [
        '--image', imagePath,
        '--language', options.language || 'eng',
        '--enhance', String(options.enhance_image ?? true),
        '--preserve-layout', String(options.preserve_layout ?? true),
      ], { timeout: 120000, signal });
      break;
    case 'easyocr':
      result = await executeScriptAndGetJson('ocr_easyocr.py', [
        '--image', imagePath,
        '--language', options.language || 'en',
      ], { timeout: 180000, signal });
      break;
    case 'claude': {
      const apiKey = options.claude_api_key || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('Claude Vision requires ANTHROPIC_API_KEY environment variable');
      }
      result = await executeScriptAndGetJson('ocr_claude.py', [
        '--image', imagePath,
        '--api-key', apiKey,
      ], { timeout: 60000, signal });
      break;
    }
    default:
      throw new Error(`Unknown OCR backend: ${backend}`);
  }

  const resultObj = result as Record<string, unknown>;
  const success = resultObj.success as boolean | undefined;
  const errorMessage = typeof resultObj.error === 'string' ? resultObj.error : undefined;

  if (!success) {
    throw new Error(errorMessage || `${backend} OCR processing failed`);
  }

  return {
    raw_text: (typeof resultObj.raw_text === 'string' ? resultObj.raw_text : '') || '',
    cleaned_text: (typeof resultObj.cleaned_text === 'string' ? resultObj.cleaned_text : '') || '',
    confidence: (typeof resultObj.confidence === 'number' ? resultObj.confidence : 0) || 0,
    backend_used: backend,
    processing_time_ms: Date.now() - startTime,
    detected_language: typeof resultObj.detected_language === 'string' ? resultObj.detected_language : undefined,
    bounding_boxes: Array.isArray(resultObj.bounding_boxes) ? resultObj.bounding_boxes as Array<{
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
    }> : undefined,
  };
}

// ============================================================================
// Content Classification & Text Cleaning
// ============================================================================

/**
 * Auto-classify content based on keywords.
 */
export function classifyContent(text: string): {
  category: Category;
  confidence: number;
  detected_topics: string[];
} {
  const textLower = text.toLowerCase();
  const detectedTopics: string[] = [];

  // Score each category
  let bestCategory: Category = 'general';
  let bestScore = 0;

  for (const [category, definition] of Object.entries(CATEGORY_DEFINITIONS)) {
    let score = 0;
    for (const keyword of definition.keywords) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        score += matches.length;
        if (!detectedTopics.includes(keyword)) {
          detectedTopics.push(keyword);
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as Category;
    }
  }

  // Calculate confidence
  const confidence = Math.min(95, Math.max(30, detectedTopics.length * 15));

  return {
    category: bestCategory,
    confidence,
    detected_topics: detectedTopics.slice(0, 10),
  };
}

/**
 * Clean and normalize extracted text.
 */
export function cleanText(rawText: string): string {
  let text = rawText;

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n');

  // Remove excessive blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  // Remove excessive spaces
  text = text.replace(/ {2,}/g, ' ');

  // Fix common OCR errors
  text = text.replace(/[|]/g, 'I');
  text = text.replace(/[0O](?=[a-z])/g, 'O');
  text = text.replace(/(?<=[a-z])[0](?=[a-z])/g, 'o');
  text = text.replace(/[1l](?=[A-Z])/g, 'I');

  // Trim whitespace from each line
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  // Final trim
  text = text.trim();

  return text;
}

// ============================================================================
// Batch Processing
// ============================================================================

export async function processImageBatch(
  imagePaths: string[],
  options: OCROptions = {},
  onProgress?: (current: number, total: number, result: OCRResult | null) => void
): Promise<OCRResult[]> {
  const results: OCRResult[] = [];

  for (let i = 0; i < imagePaths.length; i++) {
    try {
      const result = await processImage(imagePaths[i], { ...options });
      results.push(result);
      onProgress?.(i + 1, imagePaths.length, result);
    } catch (error) {
      onProgress?.(i + 1, imagePaths.length, null);
      throw error;
    }
  }

  return results;
}
