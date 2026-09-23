/**
 * Tests for knowledge base schema definitions and export format helpers.
 */
import { describe, it, expect } from '@jest/globals';
import {
  CATEGORY_DEFINITIONS,
  Category,
  TrainingPair,
  toAlpacaFormat,
  toShareGPTFormat,
  toChatMLFormat,
} from '../src/core/knowledge/schema.js';

describe('CATEGORY_DEFINITIONS', () => {
  const expectedCategories: Category[] = [
    'candlestick_patterns',
    'chart_patterns',
    'technical_indicators',
    'risk_management',
    'trading_psychology',
    'market_structure',
    'options_strategies',
    'fundamental_analysis',
    'order_flow',
    'volume_analysis',
    'general',
  ];

  it('should define all expected categories', () => {
    for (const cat of expectedCategories) {
      expect(CATEGORY_DEFINITIONS[cat]).toBeDefined();
    }
  });

  it('should have exactly 11 category definitions', () => {
    const keys = Object.keys(CATEGORY_DEFINITIONS) as Category[];
    expect(keys).toHaveLength(11);
    for (const cat of expectedCategories) {
      expect(keys).toContain(cat);
    }
  });

  it('each category should have description, keywords, and examples', () => {
    for (const [key, def] of Object.entries(CATEGORY_DEFINITIONS)) {
      expect(typeof def.description).toBe('string');
      expect(def.description.length).toBeGreaterThan(0);
      expect(Array.isArray(def.keywords)).toBe(true);
      expect(def.keywords.length).toBeGreaterThan(0);
      expect(Array.isArray(def.examples)).toBe(true);
    }
  });

  it('should contain a "general" category as fallback', () => {
    expect(CATEGORY_DEFINITIONS.general.description).toContain('General');
  });
});

describe('Export format helpers', () => {
  const samplePair: TrainingPair = {
    id: 'tp_1',
    entry_id: 'ke_1',
    type: 'qa',
    instruction: 'What is a doji?',
    input: 'Context about candlesticks',
    output: 'A doji is a candlestick pattern indicating indecision.',
    system_prompt: 'You are a trading expert.',
    quality_score: 85,
  };

  it('toAlpacaFormat should map fields correctly', () => {
    const alpaca = toAlpacaFormat(samplePair);
    expect(alpaca.instruction).toBe('What is a doji?');
    expect(alpaca.output).toBe('A doji is a candlestick pattern indicating indecision.');
    expect(alpaca.input).toBe('Context about candlesticks');
    expect(alpaca.system_prompt).toBe('You are a trading expert.');
  });

  it('toShareGPTFormat should produce system, human, gpt conversation', () => {
    const sharegpt = toShareGPTFormat(samplePair);
    expect(sharegpt.conversations).toHaveLength(3);
    expect(sharegpt.conversations[0]).toEqual({ from: 'system', value: 'You are a trading expert.' });
    expect(sharegpt.conversations[1].from).toBe('human');
    expect(sharegpt.conversations[2].from).toBe('gpt');
    expect(sharegpt.conversations[2].value).toBe('A doji is a candlestick pattern indicating indecision.');
  });

  it('toChatMLFormat should produce system, user, assistant messages', () => {
    const chatml = toChatMLFormat(samplePair);
    expect(chatml).toHaveLength(3);
    expect(chatml[0].role).toBe('system');
    expect(chatml[1].role).toBe('user');
    expect(chatml[2].role).toBe('assistant');
    expect(chatml[1].content).toContain('What is a doji?');
  });

  it('export formats should omit optional fields when absent', () => {
    const minimalPair: TrainingPair = {
      id: 'tp_2',
      entry_id: 'ke_2',
      type: 'instruction',
      instruction: 'Summarize this.',
      output: 'Summary here.',
      quality_score: 50,
    };

    const alpaca = toAlpacaFormat(minimalPair);
    expect(alpaca.input).toBeUndefined();
    expect(alpaca.system_prompt).toBeUndefined();

    const sharegpt = toShareGPTFormat(minimalPair);
    expect(sharegpt.conversations).toHaveLength(2);
    expect(sharegpt.conversations[0].from).toBe('human');
  });
});
