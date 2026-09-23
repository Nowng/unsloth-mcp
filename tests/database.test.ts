/**
 * Tests for the JSON-based KnowledgeDatabase.
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { KnowledgeDatabase } from '../src/core/knowledge/database.js';

describe('KnowledgeDatabase', () => {
  let db: KnowledgeDatabase;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unsloth-kb-test-'));
    db = new KnowledgeDatabase(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should add an entry and return its id', async () => {
    const entryId = await db.addEntry({
      source: { type: 'book', book_title: 'Trading' },
      raw_text: 'raw text',
      cleaned_text: 'cleaned text about doji patterns',
      category: 'candlestick_patterns',
      topics: ['doji'],
      tags: ['pattern'],
      quality_score: 80,
      ocr_confidence: 90,
      manually_reviewed: false,
    });

    expect(entryId).toBeTruthy();
    expect(typeof entryId).toBe('string');
  });

  it('should retrieve an entry by id', async () => {
    const entryId = await db.addEntry({
      source: { type: 'note', book_title: 'Book A' },
      raw_text: 'hello world',
      cleaned_text: 'hello world content',
      category: 'general',
      topics: [],
      tags: [],
      quality_score: 60,
      manually_reviewed: false,
    });

    const fetched = await db.getEntry(entryId);
    expect(fetched).not.toBeNull();
    expect(fetched!.cleaned_text).toBe('hello world content');
    expect(fetched!.category).toBe('general');
  });

  it('should return null for unknown entry id', async () => {
    const fetched = await db.getEntry('nonexistent_id');
    expect(fetched).toBeNull();
  });

  it('should search entries by full-text query', async () => {
    await db.addEntry({
      source: { type: 'note' },
      raw_text: 'macd crossover signal',
      cleaned_text: 'understanding macd crossover signals',
      category: 'technical_indicators',
      topics: ['macd'],
      tags: [],
      quality_score: 70,
      manually_reviewed: false,
    });

    const results = await db.searchEntries('macd');
    expect(results.length).toBe(1);
    expect(results[0].topics).toContain('macd');
  });

  it('should list entries by category', async () => {
    await db.addEntry({
      source: { type: 'note' },
      raw_text: 'a',
      cleaned_text: 'b',
      category: 'candlestick_patterns',
      topics: [],
      tags: [],
      quality_score: 50,
      manually_reviewed: false,
    });
    await db.addEntry({
      source: { type: 'note' },
      raw_text: 'c',
      cleaned_text: 'd',
      category: 'risk_management',
      topics: [],
      tags: [],
      quality_score: 50,
      manually_reviewed: false,
    });

    const results = await db.listByCategory('candlestick_patterns');
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe('candlestick_patterns');
  });

  it('should add and retrieve training pairs', async () => {
    const entryId = await db.addEntry({
      source: { type: 'note' },
      raw_text: 'text',
      cleaned_text: 'content',
      category: 'general',
      topics: [],
      tags: [],
      quality_score: 80,
      manually_reviewed: false,
    });

    const pairId = await db.addTrainingPair(entryId, {
      type: 'qa',
      instruction: 'Q?',
      output: 'A.',
      quality_score: 75,
    });

    expect(pairId).toBeTruthy();

    const allPairs = await db.getAllTrainingPairs(0);
    expect(allPairs.length).toBe(1);
    expect(allPairs[0].entry_id).toBe(entryId);

    const highQualityOnly = await db.getAllTrainingPairs(80);
    expect(highQualityOnly).toHaveLength(0);
  });

  it('should throw when adding a pair to a nonexistent entry', async () => {
    await expect(db.addTrainingPair('missing', {
      type: 'qa', instruction: 'Q', output: 'A', quality_score: 50,
    })).rejects.toThrow(/not found/i);
  });

  it('should export training data in alpaca format', async () => {
    const entryId = await db.addEntry({
      source: { type: 'note' },
      raw_text: 'text',
      cleaned_text: 'content',
      category: 'general',
      topics: [],
      tags: [],
      quality_score: 80,
      manually_reviewed: false,
    });
    await db.addTrainingPair(entryId, {
      type: 'qa', instruction: 'What is a doji?', output: 'A pattern.', quality_score: 80,
    });

    const outPath = path.join(tmpDir, 'export', 'alpaca.json');
    const result = await db.exportTrainingData(outPath, 'alpaca', 0);

    expect(result.count).toBe(1);
    expect(fs.existsSync(outPath)).toBe(true);

    const exported = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    expect(exported[0].instruction).toBe('What is a doji?');
  });

  it('should export training data in chatml format', async () => {
    const entryId = await db.addEntry({
      source: { type: 'note' },
      raw_text: 'text',
      cleaned_text: 'content',
      category: 'general',
      topics: [],
      tags: [],
      quality_score: 80,
      manually_reviewed: false,
    });
    await db.addTrainingPair(entryId, {
      type: 'qa', instruction: 'Q', output: 'A', system_prompt: 'SP', quality_score: 80,
    });

    const outPath = path.join(tmpDir, 'chatml.json');
    await db.exportTrainingData(outPath, 'chatml', 0);

    const exported = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    expect(exported.length).toBe(3); // system + user + assistant
    expect(exported[0].role).toBe('system');
    expect(exported[2].role).toBe('assistant');
  });

  it('should compute statistics', async () => {
    await db.addEntry({
      source: { type: 'note' },
      raw_text: 'a', cleaned_text: 'b',
      category: 'candlestick_patterns', topics: [], tags: [],
      quality_score: 60, manually_reviewed: false,
    });
    await db.addEntry({
      source: { type: 'note' },
      raw_text: 'c', cleaned_text: 'd',
      category: 'candlestick_patterns', topics: [], tags: [],
      quality_score: 100, manually_reviewed: false,
    });

    const stats = await db.getStats();
    expect(stats.total_entries).toBe(2);
    expect(stats.entries_by_category.candlestick_patterns).toBe(2);
    expect(stats.total_training_pairs).toBe(0);
    expect(stats.avg_quality_score).toBe(80);
  });
});
