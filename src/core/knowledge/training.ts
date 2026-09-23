/**
 * Training Data Generation
 * 
 * Generates training pairs from knowledge base entries.
 * Uses Python scripts for AI-enhanced generation when API keys are available.
 */

import { KnowledgeEntry, TrainingPair, Category } from './schema.js';

export interface GeneratorOptions {
  minQualityScore?: number;
  pairsPerEntry?: number;
  includeSystemPrompt?: boolean;
  generateSynthetic?: boolean;
}

// ============================================================================
// System Prompts
// ============================================================================

export const SYSTEM_PROMPTS: Record<string, string> = {
  default: 'You are a helpful trading assistant with expertise in technical analysis.',
  candlestick_patterns: 'You are an expert in candlestick pattern recognition and trading signals.',
  chart_patterns: 'You are a specialist in chart pattern analysis and price action.',
  technical_indicators: 'You are knowledgeable about technical indicators and oscillators.',
  risk_management: 'You are a risk management expert specializing in position sizing and capital protection.',
  trading_psychology: 'You are a trading psychology coach helping traders maintain discipline.',
  market_structure: 'You understand market structure, liquidity, and price action dynamics.',
  options_strategies: 'You are an options trading specialist with expertise in various strategies.',
  fundamental_analysis: 'You analyze stocks using fundamental metrics and valuation.',
  order_flow: 'You specialize in order flow analysis and volume profiling.',
  volume_analysis: 'You are an expert in volume-based trading insights.',
};

// ============================================================================
// Training Pair Generation
// ============================================================================

/**
 * Generate training pairs from a single entry.
 * Uses rule-based generation (no AI) plus optional synthetic generation.
 */
export function generateTrainingPairs(
  entry: KnowledgeEntry,
  options: GeneratorOptions = {}
): TrainingPair[] {
  const {
    minQualityScore = 0,
    pairsPerEntry = 3,
    includeSystemPrompt = true,
  } = options;

  // Skip low-quality entries
  if (entry.quality_score < minQualityScore) {
    return [];
  }

  const cleanedText = entry.cleaned_text.trim();
  if (!cleanedText) {
    return [];
  }

  // Split text into sentences
  const sentences = cleanedText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  const systemPrompt = includeSystemPrompt
    ? (SYSTEM_PROMPTS[entry.category] || SYSTEM_PROMPTS.default)
    : undefined;

  const pairs: TrainingPair[] = [];
  let counter = 0;

  // Generate Q&A style pairs from sentences
  for (let i = 0; i < sentences.length && counter < pairsPerEntry; i++) {
    const sentence = sentences[i];
    
    // Skip if sentence is too short to be useful
    if (sentence.length < 20) continue;

    const instruction = `Based on the knowledge entry about ${entry.category.replace(/_/g, ' ')}, explain: ${sentence.slice(0, 150)}`;
    
    pairs.push({
      id: '',
      entry_id: entry.id,
      type: 'qa',
      instruction,
      output: sentence,
      system_prompt: systemPrompt,
      quality_score: Math.round(entry.quality_score * 0.8),
    });

    counter++;
  }

  // If we couldn't generate enough from sentences, create a summary-based pair
  if (pairs.length === 0) {
    pairs.push({
      id: '',
      entry_id: entry.id,
      type: 'instruction',
      instruction: `Summarize the key points about ${entry.category.replace(/_/g, ' ')}`,
      output: cleanedText.slice(0, 300),
      system_prompt: systemPrompt,
      quality_score: Math.round(entry.quality_score * 0.7),
    });
  }

  return pairs;
}

/**
 * Generate training pairs from the entire database.
 */
export async function generateFromDatabase(
  entries: KnowledgeEntry[],
  options: GeneratorOptions = {}
): Promise<{
  pairs_generated: number;
  pairs: TrainingPair[];
}> {
  let allPairs: TrainingPair[] = [];

  for (const entry of entries) {
    const pairs = generateTrainingPairs(entry, options);
    allPairs = [...allPairs, ...pairs];
  }

  // Assign IDs
  let counter = 0;
  for (const pair of allPairs) {
    pair.id = `tp_${Date.now()}_${counter++}`;
  }

  return {
    pairs_generated: allPairs.length,
    pairs: allPairs,
  };
}

/**
 * Generate synthetic AI-enhanced pairs.
 * Requires ANTHROPIC_API_KEY for Claude Vision/Text generation.
 */
export async function generateSyntheticPairs(
  entryText: string,
  category: Category,
  pairsPerEntry: number = 3
): Promise<TrainingPair[]> {
  // For now, this returns an empty array.
  // AI-enhanced generation would require Claude API integration.
  // The rule-based generateTrainingPairs handles the core functionality.
  
  void entryText;
  void category;
  void pairsPerEntry;
  
  return [];
}
