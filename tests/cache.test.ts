/**
 * Tests for the in-memory Cache implementation.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Cache } from '../src/core/utils/cache.js';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache(true);
  });

  it('should store and retrieve values', () => {
    cache.set('key', 'value');
    expect(cache.get<string>('key')).toBe('value');
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get<string>('missing')).toBeUndefined();
  });

  it('should report existence via has()', () => {
    cache.set('present', 123);
    expect(cache.has('present')).toBe(true);
    expect(cache.has('absent')).toBe(false);
  });

  it('should delete keys', () => {
    cache.set('key', 'value');
    cache.delete('key');
    expect(cache.has('key')).toBe(false);
  });

  it('should clear all entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.getStats().size).toBe(0);
  });

  it('should respect TTL expiration', async () => {
    jest.useFakeTimers();
    cache.set('temp', 'data', 1);
    expect(cache.get<string>('temp')).toBe('data');

    // Advance time past the TTL
    await jest.advanceTimersByTimeAsync(1500);
    expect(cache.get<string>('temp')).toBeUndefined();
    jest.useRealTimers();
  });

  it('should be disabled when constructed with enabled=false', () => {
    const disabled = new Cache(false);
    disabled.set('key', 'value');
    expect(disabled.get<string>('key')).toBeUndefined();
    expect(disabled.getStats().enabled).toBe(false);
  });

  it('should store typed values and retrieve them', () => {
    cache.set('num', 42);
    cache.set('obj', { a: 1 });
    expect(cache.get<number>('num')).toBe(42);
    expect(cache.get<{ a: number }>('obj')).toEqual({ a: 1 });
  });
});
