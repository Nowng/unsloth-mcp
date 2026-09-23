/**
 * Knowledge Base Module - Index
 * 
 * Complete pipeline for OCR processing, knowledge cataloguing,
 * and training data generation for fine-tuning.
 */

// Schema - types
export type {
  KnowledgeEntry,
  SourceInfo,
  Category,
  TrainingPair,
  AlpacaFormat,
  ShareGPTFormat,
  ChatMLFormat,
} from './schema.js';

// Schema - values
export {
  CATEGORY_DEFINITIONS,
} from './schema.js';

// Database operations
export { KnowledgeDatabase, knowledgeDb } from './database.js';

// OCR processing - types
export type { OCRResult, OCROptions } from './ocr.js';

// OCR processing - values
export {
  checkOCRBackends,
  processImage,
  processImageBatch,
  classifyContent,
  cleanText,
} from './ocr.js';

// Training data generation - types
export type { GeneratorOptions } from './training.js';

// Training data generation - values
export {
  SYSTEM_PROMPTS,
  generateTrainingPairs,
  generateFromDatabase,
  generateSyntheticPairs,
} from './training.js';
