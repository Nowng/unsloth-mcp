/**
 * Knowledge Base Tools
 *
 * Defines tools for OCR processing, knowledge search, and training data generation.
 */

import { tool, Tool } from '@lmstudio/sdk';
import { z } from 'zod';
import { knowledgeDb } from '../core/knowledge/database.js';
import { processImage, checkOCRBackends, classifyContent, cleanText } from '../core/knowledge/ocr.js';
import type { Category, TrainingPair } from '../core/knowledge/schema.js';
import { generateTrainingPairs, generateFromDatabase } from '../core/knowledge/training.js';
import { CATEGORY_DEFINITIONS } from '../core/knowledge/schema.js';
import { isAbortError } from '../core/pythonExecutor.js';
import type { ChatConfigType } from '../config.js';

export function createKnowledgeTools(_chatConfig: ChatConfigType): Tool[] {

  // ============================================================================
  // process_book_image
  // ============================================================================

  const processBookImageTool = tool({
    name: 'process_book_image',
    description: 'OCR a book/document image and catalogue the extracted text into the knowledge base.',
    parameters: {
      image_path: z.string().describe('Path to the image file (jpg, png, etc.)'),
      book_title: z.string().optional().describe('Title of the book (optional)'),
      author: z.string().optional().describe('Author of the book (optional)'),
      chapter: z.string().optional().describe('Chapter name or number (optional)'),
      page_numbers: z.string().optional().describe('Page number(s) (optional)'),
      category: z.enum([
        'candlestick_patterns', 'chart_patterns', 'technical_indicators',
        'risk_management', 'trading_psychology', 'market_structure',
        'options_strategies', 'fundamental_analysis', 'order_flow',
        'volume_analysis', 'general',
      ]).optional().describe('Content category for classification'),
      tags: z.array(z.string()).optional().describe('Tags for this content (optional)'),
      ocr_backend: z.enum(['auto', 'tesseract', 'easyocr', 'claude']).optional().describe('OCR backend to use'),
    },
    implementation: async ({
      image_path,
      book_title,
      author,
      chapter,
      page_numbers,
      category,
      tags = [],
      ocr_backend = 'auto',
    }, { signal, status, warn }) => {
      try {
        if (!signal) {
          warn('No abort signal provided; OCR cannot be cancelled mid-run.');
        }

        status(`Performing OCR on ${image_path} (backend: ${ocr_backend})`);
        const ocrResult = await processImage(image_path, {
          backend: ocr_backend as 'auto' | 'tesseract' | 'easyocr' | 'claude',
          enhance_image: true,
          signal,
        });

        const classification = classifyContent(ocrResult.cleaned_text);
        const finalCategory = category || classification.category;

        const entryId = await knowledgeDb.addEntry({
          source: {
            type: 'book',
            book_title,
            author,
            chapter,
            page_numbers,
            image_path,
            capture_date: new Date().toISOString(),
          },
          raw_text: ocrResult.raw_text,
          cleaned_text: cleanText(ocrResult.raw_text),
          category: finalCategory,
          topics: classification.detected_topics,
          tags,
          quality_score: Math.round(ocrResult.confidence),
          ocr_confidence: ocrResult.confidence,
          manually_reviewed: false,
        });

        return JSON.stringify({
          success: true,
          entry_id: entryId,
          ocr_backend: ocrResult.backend_used,
          ocr_confidence: ocrResult.confidence,
          processing_time_ms: ocrResult.processing_time_ms,
          category: finalCategory,
          detected_topics: classification.detected_topics,
        }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: OCR operation was aborted by the user.';
        }
        return `Error processing book image: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // batch_process_images
  // ============================================================================

  const batchProcessImagesTool = tool({
    name: 'batch_process_images',
    description: 'Process multiple book images at once and catalogue them.',
    parameters: {
      image_paths: z.array(z.string()).describe('Array of image file paths'),
      book_title: z.string().optional().describe('Title of the book (applies to all)'),
      author: z.string().optional().describe('Author of the book (applies to all)'),
      category: z.enum([
        'candlestick_patterns', 'chart_patterns', 'technical_indicators',
        'risk_management', 'trading_psychology', 'market_structure',
        'options_strategies', 'fundamental_analysis', 'order_flow',
        'volume_analysis', 'general',
      ]).optional().describe('Content category'),
      ocr_backend: z.enum(['auto', 'tesseract', 'easyocr', 'claude']).optional().describe('OCR backend to use'),
    },
    implementation: async ({
      image_paths,
      book_title,
      author,
      category,
      ocr_backend = 'auto',
    }, { signal, status }) => {
      const results: Array<{ path: string; entry_id?: string; error?: string }> = [];

      for (let i = 0; i < image_paths.length; i++) {
        if (signal?.aborted) {
          return JSON.stringify({
            success: false,
            aborted: true,
            processed: i,
            total: image_paths.length,
            results,
          }, null, 2);
        }

        const imagePath = image_paths[i];
        status(`Processing image ${i + 1} of ${image_paths.length}: ${imagePath}`);
        try {
          const ocrResult = await processImage(imagePath, {
            backend: ocr_backend as 'auto' | 'tesseract' | 'easyocr' | 'claude',
            enhance_image: true,
            signal,
          });

          const classification = classifyContent(ocrResult.cleaned_text);
          const finalCategory = category || classification.category;

          const entryId = await knowledgeDb.addEntry({
            source: {
              type: 'book',
              book_title,
              author,
              page_numbers: `Image ${i + 1}`,
              image_path: imagePath,
              capture_date: new Date().toISOString(),
            },
            raw_text: ocrResult.raw_text,
            cleaned_text: cleanText(ocrResult.raw_text),
            category: finalCategory,
            topics: classification.detected_topics,
            tags: [],
            quality_score: Math.round(ocrResult.confidence),
            ocr_confidence: ocrResult.confidence,
            manually_reviewed: false,
          });

          results.push({ path: imagePath, entry_id: entryId });
        } catch (error) {
          if (isAbortError(error)) {
            return JSON.stringify({ success: false, aborted: true, processed: i, total: image_paths.length, results }, null, 2);
          }
          results.push({ path: imagePath, error: error instanceof Error ? error.message : String(error) });
        }
      }

      const successful = results.filter(r => r.entry_id).length;
      const failed = results.filter(r => r.error).length;

      return JSON.stringify({
        success: true,
        total_images: image_paths.length,
        successful,
        failed,
        results,
      }, null, 2);
    },
  });

  // ============================================================================
  // search_knowledge
  // ============================================================================

  const searchKnowledgeTool = tool({
    name: 'search_knowledge',
    description: 'Search the knowledge base using full-text search.',
    parameters: {
      query: z.string().describe('Search query'),
      limit: z.number().optional(),
    },
    implementation: async ({ query, limit = 20 }, { signal }) => {
      try {
        const entries = await knowledgeDb.searchEntries(query, limit, { signal });
        return JSON.stringify({ success: true, query, count: entries.length, entries }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error searching knowledge base: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // list_knowledge_by_category
  // ============================================================================

  const listKnowledgeByCategoryTool = tool({
    name: 'list_knowledge_by_category',
    description: 'List knowledge entries by category.',
    parameters: {
      category: z.enum([
        'candlestick_patterns', 'chart_patterns', 'technical_indicators',
        'risk_management', 'trading_psychology', 'market_structure',
        'options_strategies', 'fundamental_analysis', 'order_flow',
        'volume_analysis', 'general',
      ]).describe('Category to filter by'),
      limit: z.number().optional(),
    },
    implementation: async ({ category, limit = 50 }, { signal }) => {
      try {
        const entries = await knowledgeDb.listByCategory(category as Category, limit, { signal });
        return JSON.stringify({ success: true, category, count: entries.length, entries }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error listing knowledge entries: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // get_knowledge_entry
  // ============================================================================

  const getKnowledgeEntryTool = tool({
    name: 'get_knowledge_entry',
    description: 'Get a specific knowledge entry by ID.',
    parameters: {
      entry_id: z.string().describe('The knowledge entry ID'),
    },
    implementation: async ({ entry_id }, { signal }) => {
      try {
        const entry = await knowledgeDb.getEntry(entry_id, { signal });
        if (!entry) {
          return JSON.stringify({ success: false, error: `Knowledge entry not found: ${entry_id}` }, null, 2);
        }
        return JSON.stringify({ success: true, entry }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error getting knowledge entry: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // generate_training_pairs
  // ============================================================================

  const generateTrainingPairsTool = tool({
    name: 'generate_training_pairs',
    description: 'Generate training data pairs from knowledge base entries.',
    parameters: {
      entry_id: z.string().optional().describe('Generate pairs from specific entry (optional)'),
      min_quality_score: z.number().optional().describe('Minimum quality score for entries (0-100, default: 30)'),
      pairs_per_entry: z.number().optional().describe('Number of pairs to generate per entry (default: 3)'),
      include_system_prompt: z.boolean().optional().describe('Include system prompts in pairs (default: true)'),
    },
    implementation: async ({
      entry_id,
      min_quality_score = 30,
      pairs_per_entry = 3,
      include_system_prompt = true,
    }, { signal, status }) => {
      try {
        if (entry_id) {
          status(`Generating training pairs for entry ${entry_id}`);
          const entry = await knowledgeDb.getEntry(entry_id, { signal });
          if (!entry) {
            return JSON.stringify({ success: false, error: `Entry not found: ${entry_id}` }, null, 2);
          }

          const pairs = generateTrainingPairs(entry, {
            minQualityScore: min_quality_score,
            pairsPerEntry: pairs_per_entry,
            includeSystemPrompt: include_system_prompt,
          });

          return JSON.stringify({ success: true, entry_id, pairs_generated: pairs.length, pairs }, null, 2);
        } else {
          status('Scanning knowledge base and generating training pairs');
          const allEntries = await knowledgeDb.listAll({ signal });
          const result = await generateFromDatabase(allEntries, {
            minQualityScore: min_quality_score,
            pairsPerEntry: pairs_per_entry,
            includeSystemPrompt: include_system_prompt,
          });

          // Store generated pairs
          for (const pair of result.pairs) {
            const { id: _ignoredId, entry_id: _ignoredEntryId, ...pairWithoutIds } = pair;
            await knowledgeDb.addTrainingPair(pair.entry_id, pairWithoutIds as Omit<TrainingPair, 'id' | 'entry_id'>);
          }

          return JSON.stringify({ success: true, ...result }, null, 2);
        }
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error generating training pairs: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // export_training_data
  // ============================================================================

  const exportTrainingDataTool = tool({
    name: 'export_training_data',
    description: 'Export all training pairs to a file for fine-tuning.',
    parameters: {
      output_path: z.string().describe('Path to save the training data file'),
      format: z.enum(['alpaca', 'sharegpt', 'chatml']).describe('Output format'),
      min_quality_score: z.number().optional().describe('Minimum quality score to include (default: 0)'),
    },
    implementation: async ({ output_path, format, min_quality_score = 0 }, { signal, status }) => {
      try {
        status(`Exporting training data (${format})...`);
        const result = await knowledgeDb.exportTrainingData(output_path, format, min_quality_score, { signal });
        return JSON.stringify({
          success: true,
          format,
          count: result.count,
          path: result.path,
          message: `Training data exported to ${result.path}. Ready for fine-tuning!`,
        }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error exporting training data: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // knowledge_stats
  // ============================================================================

  const knowledgeStatsTool = tool({
    name: 'knowledge_stats',
    description: 'Get statistics about the knowledge base.',
    parameters: {},
    implementation: async (_params, { signal }) => {
      try {
        const stats = await knowledgeDb.getStats({ signal });
        return JSON.stringify({ success: true, ...stats }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error getting knowledge stats: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // check_ocr_backends
  // ============================================================================

  const checkOcrBackendsTool = tool({
    name: 'check_ocr_backends',
    description: 'Check which OCR backends are available on the system.',
    parameters: {},
    implementation: async (_params, { signal, warn }) => {
      try {
        const backends = await checkOCRBackends({ signal });
        const available = Object.entries(backends)
          .filter(([, v]) => v)
          .map(([k]) => k);

        if (available.length === 0) {
          warn('No OCR backend is available. Install pytesseract or easyocr in the plugin venv.');
        }

        return JSON.stringify({
          success: true,
          backends,
          available,
          recommendation: backends.tesseract
            ? 'tesseract (fast, good for clear text)'
            : backends.easyocr
              ? 'easyocr (slower, better accuracy)'
              : backends.claude
                ? 'claude (best for charts/diagrams, requires API key)'
                : 'No OCR backend available. Install pytesseract or easyocr.',
        }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error checking OCR backends: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // list_categories
  // ============================================================================

  const listCategoriesTool = tool({
    name: 'list_categories',
    description: 'List all available knowledge categories with descriptions.',
    parameters: {},
    implementation: async (_params) => {
      const categories = Object.entries(CATEGORY_DEFINITIONS).map(([key, value]) => ({
        id: key,
        description: value.description,
        keywords: value.keywords.slice(0, 5),
        examples: value.examples.slice(0, 2),
      }));

      return JSON.stringify({ success: true, categories }, null, 2);
    },
  });

  return [
    processBookImageTool,
    batchProcessImagesTool,
    searchKnowledgeTool,
    listKnowledgeByCategoryTool,
    getKnowledgeEntryTool,
    generateTrainingPairsTool,
    exportTrainingDataTool,
    knowledgeStatsTool,
    checkOcrBackendsTool,
    listCategoriesTool,
  ];
}
