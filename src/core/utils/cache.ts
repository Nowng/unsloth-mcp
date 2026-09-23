/**
 * In-Memory Cache
 * 
 * Simple key-value cache with TTL support.
 * Replaces the original file-based cache for LM Studio compatibility.
 */

interface CacheEntry {
  value: unknown;
  expiresAt: number | null;
}

export class Cache {
  private store: Map<string, CacheEntry>;
  private enabled: boolean;

  constructor(enabled = true) {
    this.store = new Map();
    this.enabled = enabled;
  }

  set(key: string, value: unknown, ttlSeconds?: number): void {
    if (!this.enabled) return;

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;

    const entry = this.store.get(key);
    if (!entry) return undefined;

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  getStats(): { enabled: boolean; size: number } {
    return {
      enabled: this.enabled,
      size: this.store.size,
    };
  }
}

// Default singleton
export const cache = new Cache(true);
