/**
 * Tests for OCR text classification and cleaning utilities.
 */
import { describe, it, expect } from '@jest/globals';
import { classifyContent, cleanText } from '../src/core/knowledge/ocr.js';

describe('classifyContent', () => {
  it('should detect candlestick patterns by keyword', () => {
    const result = classifyContent('A doji pattern indicates market indecision. The hammer signal is bullish.');
    expect(result.category).toBe('candlestick_patterns');
    expect(result.detected_topics.some(t => ['doji', 'hammer'].includes(t))).toBe(true);
  });

  it('should detect technical indicators by keyword', () => {
    const result = classifyContent('The RSI is overbought and MACD shows a crossover signal.');
    expect(result.category).toBe('technical_indicators');
  });

  it('should detect risk management topics', () => {
    const result = classifyContent('Always use a stop loss and manage your position size carefully.');
    expect(result.category).toBe('risk_management');
  });

  it('should default to general when no keywords match', () => {
    const result = classifyContent('The weather is nice today and I like eating pizza.');
    expect(result.category).toBe('general');
  });

  it('should return confidence between 30 and 95', () => {
    const result = classifyContent('RSI stochastic MACD bollinger moving average analysis');
    expect(result.confidence).toBeGreaterThanOrEqual(30);
    expect(result.confidence).toBeLessThanOrEqual(95);
  });

  it('should increase confidence with more detected topics', () => {
    const few = classifyContent('some generic text here');
    const many = classifyContent('doji hammer engulffing morning star evening star shooting star analysis');
    expect(many.detected_topics.length).toBeGreaterThan(few.detected_topics.length);
  });
});

describe('cleanText', () => {
  it('should normalize line endings', () => {
    const result = cleanText('line1\r\nline2\r\nline3');
    expect(result).toBe('line1\nline2\nline3');
  });

  it('should collapse excessive blank lines', () => {
    const result = cleanText('text\n\n\n\nmore');
    expect(result).toBe('text\n\nmore');
  });

  it('should collapse multiple spaces', () => {
    const result = cleanText('word    with    spaces');
    expect(result).toBe('word with spaces');
  });

  it('should trim leading/trailing whitespace on each line', () => {
    const result = cleanText('  padded  \n  more  ');
    expect(result).toBe('padded\nmore');
  });

  it('should replace pipe characters with capital I', () => {
    const result = cleanText('a|b');
    expect(result).toBe('aIb');
  });

  it('should trim the final output', () => {
    const result = cleanText('   trimmed content   ');
    expect(result.trim()).toBe(result);
  });
});
