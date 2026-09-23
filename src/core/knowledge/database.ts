/**
 * Knowledge Database - JSON-based Storage
 * 
 * Node.js native implementation using JSON files.
 * Replaces the original Python sqlite3 implementation for LM Studio compatibility.
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { ExecutionAbortedError } from '../pythonExecutor.js';
import {
  KnowledgeEntry,
  Category,
  TrainingPair,
  AlpacaFormat,
  ShareGPTFormat,
  ChatMLFormat,
  toAlpacaFormat,
  toShareGPTFormat,
  toChatMLFormat,
} from './schema.js';

// ============================================================================
// Storage Paths
// ============================================================================

const DEFAULT_DB_DIR = path.join(process.cwd(), 'data', 'knowledge');

/**
 * Optional abort support for knowledge-base operations.
 */
export interface DbOptions {
  signal?: AbortSignal;
}

function assertNotAborted(options?: DbOptions): void {
  if (options?.signal?.aborted) {
    throw new ExecutionAbortedError();
  }
}

export class KnowledgeDatabase {
  private dbDir: string;
  private entriesFile: string;
  private pairsFile: string;

  constructor(dbPath?: string) {
    this.dbDir = dbPath ? path.join(dbPath, 'knowledge') : DEFAULT_DB_DIR;
    this.entriesFile = path.join(this.dbDir, 'entries.json');
    this.pairsFile = path.join(this.dbDir, 'training_pairs.json');
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private ensureDirectory(): void {
    if (!fs.existsSync(this.dbDir)) {
      fs.mkdirSync(this.dbDir, { recursive: true });
    }
  }

  private readJsonFile<T>(file: string, fallback: T): T {
    try {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        return content ? JSON.parse(content) : fallback;
      }
    } catch (error) {
      console.error(`Failed to read ${file}:`, error);
    }
    return fallback;
  }

  private writeJsonFile(file: string, data: unknown): void {
    this.ensureDirectory();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  }

  // ============================================================================
  // Entry Operations
  // ============================================================================

  async addEntry(entry: Omit<KnowledgeEntry, 'id' | 'created_at' | 'updated_at' | 'training_pairs' | 'related_entries'>): Promise<string> {
    const entries = this.readJsonFile<KnowledgeEntry[]>(this.entriesFile, []);
    
    const now = new Date().toISOString();
    const newEntry: KnowledgeEntry = {
      id: randomUUID(),
      created_at: now,
      updated_at: now,
      source: entry.source,
      raw_text: entry.raw_text,
      cleaned_text: entry.cleaned_text,
      category: entry.category,
      topics: entry.topics,
      tags: entry.tags,
      quality_score: entry.quality_score,
      ocr_confidence: entry.ocr_confidence,
      manually_reviewed: entry.manually_reviewed,
      training_pairs: [],
      related_entries: [],
    };

    entries.push(newEntry);
    this.writeJsonFile(this.entriesFile, entries);

    return newEntry.id;
  }

  async getEntry(entryId: string, options?: DbOptions): Promise<KnowledgeEntry | null> {
    assertNotAborted(options);
    const entries = this.readJsonFile<KnowledgeEntry[]>(this.entriesFile, []);
    return entries.find(e => e.id === entryId) || null;
  }

  async searchEntries(query: string, limit = 20, options?: DbOptions): Promise<KnowledgeEntry[]> {
    assertNotAborted(options);
    const entries = this.readJsonFile<KnowledgeEntry[]>(this.entriesFile, []);
    const queryLower = query.toLowerCase();

    return entries
      .filter(e => 
        e.cleaned_text.toLowerCase().includes(queryLower) ||
        e.raw_text.toLowerCase().includes(queryLower) ||
        e.topics.some(t => t.toLowerCase().includes(queryLower))
      )
      .slice(0, limit);
  }

  async listByCategory(category: Category, limit = 50, options?: DbOptions): Promise<KnowledgeEntry[]> {
    assertNotAborted(options);
    const entries = this.readJsonFile<KnowledgeEntry[]>(this.entriesFile, []);
    return entries.filter(e => e.category === category).slice(0, limit);
  }

  async listAll(options?: DbOptions): Promise<KnowledgeEntry[]> {
    assertNotAborted(options);
    return this.readJsonFile<KnowledgeEntry[]>(this.entriesFile, []);
  }

  // ============================================================================
  // Training Pair Operations
  // ============================================================================

  async addTrainingPair(entryId: string, pair: Omit<TrainingPair, 'id' | 'entry_id'>): Promise<string> {
    const entries = this.readJsonFile<KnowledgeEntry[]>(this.entriesFile, []);
    const entryIndex = entries.findIndex(e => e.id === entryId);

    if (entryIndex < 0) {
      throw new Error(`Knowledge entry not found: ${entryId}`);
    }

    const trainingPairs = this.readJsonFile<TrainingPair[]>(this.pairsFile, []);
    const newPair: TrainingPair = {
      ...pair,
      id: randomUUID(),
      entry_id: entryId,
    };

    trainingPairs.push(newPair);
    this.writeJsonFile(this.pairsFile, trainingPairs);

    // Update entry's training_pairs reference
    entries[entryIndex].training_pairs = entries[entryIndex].training_pairs || [];
    entries[entryIndex].training_pairs.push(newPair);
    entries[entryIndex].updated_at = new Date().toISOString();
    this.writeJsonFile(this.entriesFile, entries);

    return newPair.id;
  }

  async getAllTrainingPairs(minQuality = 0): Promise<TrainingPair[]> {
    const pairs = this.readJsonFile<TrainingPair[]>(this.pairsFile, []);
    return pairs.filter(p => p.quality_score >= minQuality);
  }

  // ============================================================================
  // Export Operations
  // ============================================================================

  async exportTrainingData(
    outputPath: string,
    format: 'alpaca' | 'sharegpt' | 'chatml',
    minQuality = 0,
    options?: DbOptions
  ): Promise<{ count: number; path: string }> {
    assertNotAborted(options);
    const pairs = await this.getAllTrainingPairs(minQuality);

    let exportData: (AlpacaFormat | ShareGPTFormat | ChatMLFormat)[];

    switch (format) {
      case 'alpaca':
        exportData = pairs.map(toAlpacaFormat);
        break;
      case 'sharegpt':
        exportData = pairs.map(toShareGPTFormat);
        break;
      case 'chatml':
        exportData = pairs.reduce((acc, pair) => [...acc, ...toChatMLFormat(pair)], [] as ChatMLFormat[]);
        break;
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write to file
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');

    return { count: exportData.length, path: outputPath };
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async getStats(options?: DbOptions): Promise<{
    total_entries: number;
    entries_by_category: Record<string, number>;
    total_training_pairs: number;
    avg_quality_score: number;
  }> {
    assertNotAborted(options);
    const entries = this.readJsonFile<KnowledgeEntry[]>(this.entriesFile, []);
    const pairs = this.readJsonFile<TrainingPair[]>(this.pairsFile, []);

    const byCategory: Record<string, number> = {};
    for (const entry of entries) {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    }

    const avgQuality = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.quality_score, 0) / entries.length
      : 0;

    return {
      total_entries: entries.length,
      entries_by_category: byCategory,
      total_training_pairs: pairs.length,
      avg_quality_score: Math.round(avgQuality * 100) / 100,
    };
  }
}

// Default singleton instance
export const knowledgeDb = new KnowledgeDatabase();
