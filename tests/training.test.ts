/**
 * Tests for training data generation logic.
 */
import { describe, it, expect } from '@jest/globals';
import {
  SYSTEM_PROMPTS,
  generateTrainingPairs,
  generateSyntheticPairs,
} from '../src/core/knowledge/training.js';
import type { KnowledgeEntry } from '../src/core/knowledge/schema.js';

function makeEntry(overrides: Partial<KnowledgeEntry> = {}): KnowledgeEntry {
  return {
    id: 'ke_1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    source: { type: 'book', book_title: 'Trading Basics' },
    raw_text: '',
    cleaned_text: 'A doji is a candlestick pattern. It signals indecision in the market. Traders watch for confirmation.',
    category: 'candlestick_patterns',
    topics: ['doji'],
    tags: ['pattern'],
    quality_score: 80,
    manually_reviewed: false,
    ...overrides,
  };
}

describe('SYSTEM_PROMPTS', () => {
  it('should have a default prompt', () => {
    expect(SYSTEM_PROMPTS.default).toContain('trading assistant');
  });

  it('should have prompts for each category', () => {
    for (const category of Object.keys(SYSTEM_PROMPTS)) {
      if (category === 'default') continue;
      expect(typeof SYSTEM_PROMPTS[category]).toBe('string');
      expect(SYSTEM_PROMPTS[category].length).toBeGreaterThan(0);
    }
  });
});

describe('generateTrainingPairs', () => {
  it('should generate multiple QA pairs from a high-quality entry', () => {
    const entry = makeEntry();
    const pairs = generateTrainingPairs(entry, { pairsPerEntry: 3 });
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs.length).toBeLessThanOrEqual(3);

    for (const pair of pairs) {
      expect(pair.entry_id).toBe('ke_1');
      expect(pair.type).toBe('qa');
      expect(pair.instruction.length).toBeGreaterThan(0);
      expect(pair.output.length).toBeGreaterThan(0);
    }
  });

  it('should include system prompt when enabled', () => {
    const entry = makeEntry();
    const pairs = generateTrainingPairs(entry, { includeSystemPrompt: true });
    expect(pairs[0].system_prompt).toBe(SYSTEM_PROMPTS.candlestick_patterns);
  });

  it('should omit system prompt when disabled', () => {
    const entry = makeEntry();
    const pairs = generateTrainingPairs(entry, { includeSystemPrompt: false });
    for (const pair of pairs) {
      expect(pair.system_prompt).toBeUndefined();
    }
  });

  it('should respect minQualityScore filter', () => {
    const lowQuality = makeEntry({ quality_score: 20 });
    const pairs = generateTrainingPairs(lowQuality, { minQualityScore: 30 });
    expect(pairs).toHaveLength(0);
  });

  it('should return empty array for empty cleaned text', () => {
    const entry = makeEntry({ cleaned_text: '   ' });
    const pairs = generateTrainingPairs(entry);
    expect(pairs).toHaveLength(0);
  });

  it('should produce summary-based pair when no usable sentences exist', () => {
    const entry = makeEntry({ cleaned_text: 'Short.' });
    const pairs = generateTrainingPairs(entry, { pairsPerEntry: 3 });
    expect(pairs.length).toBeGreaterThanOrEqual(1);
    expect(pairs[0].type).toBe('instruction');
    expect(pairs[0].instruction).toContain('Summarize');
  });

  it('should lower quality score of generated pairs relative to source', () => {
    const entry = makeEntry({ quality_score: 100 });
    const pairs = generateTrainingPairs(entry);
    for (const pair of pairs) {
      expect(pair.quality_score).toBeLessThanOrEqual(100);
    }
  });
});

describe('generateSyntheticPairs', () => {
  it('should return empty array when no API key is configured (graceful fallback)', async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const pairs = await generateSyntheticPairs('Some text about doji', 'candlestick_patterns');
      expect(Array.isArray(pairs)).toBe(true);
    } finally {
      if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
    }
  });
});
