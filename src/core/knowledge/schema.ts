/**
 * Knowledge Base Schema - Type Definitions
 * 
 * Defines the type structure for knowledge entries, categories, and training data.
 */

// ============================================================================
// Categories
// ============================================================================

export type Category =
  | 'candlestick_patterns'
  | 'chart_patterns'
  | 'technical_indicators'
  | 'risk_management'
  | 'trading_psychology'
  | 'market_structure'
  | 'options_strategies'
  | 'fundamental_analysis'
  | 'order_flow'
  | 'volume_analysis'
  | 'general';

// ============================================================================
// Category Definitions (for UI and auto-classification)
// ============================================================================

export interface CategoryDefinition {
  description: string;
  keywords: string[];
  examples: string[];
}

export const CATEGORY_DEFINITIONS: Record<Category, CategoryDefinition> = {
  candlestick_patterns: {
    description: 'Candlestick pattern recognition and trading signals',
    keywords: ['doji', 'hammer', 'engulfing', 'morning star', 'evening star', 'shooting star', 'hanging man', 'pin bar'],
    examples: ['Hammer pattern indicates potential reversal', 'Engulfing pattern shows strong momentum shift'],
  },
  chart_patterns: {
    description: 'Chart pattern analysis and technical formations',
    keywords: ['support', 'resistance', 'trendline', 'triangle', 'head shoulders', 'double top', 'double bottom', 'flag'],
    examples: ['Ascending triangle breakout pattern', 'Double top resistance level'],
  },
  technical_indicators: {
    description: 'Technical indicators and oscillators',
    keywords: ['rsi', 'macd', 'bollinger', 'moving average', 'stochastic', 'adx', 'cci', 'williams'],
    examples: ['RSI overbought conditions', 'MACD crossover signal'],
  },
  risk_management: {
    description: 'Risk management and position sizing',
    keywords: ['stop loss', 'position size', 'risk reward', 'leverage', 'drawdown', 'capital protection', 'stop hit'],
    examples: ['Position sizing based on 2% rule', 'Stop loss placement strategy'],
  },
  trading_psychology: {
    description: 'Trading psychology and discipline',
    keywords: ['discipline', 'patience', 'fomo', 'greed', 'fear', 'emotional', 'mindset', 'journaling'],
    examples: ['Managing FOMO during volatile markets', 'Trading discipline checklist'],
  },
  market_structure: {
    description: 'Market structure and price action',
    keywords: ['supply demand', 'liquidity', 'order block', 'fair value gap', 'market structure', 'swing high', 'swing low'],
    examples: ['Supply and demand zone identification', 'Liquidity sweep pattern'],
  },
  options_strategies: {
    description: 'Options trading strategies',
    keywords: ['call', 'put', 'spread', 'straddle', 'strangle', 'covered call', 'collar', 'gamma'],
    examples: ['Covered call income strategy', 'Bull spread position'],
  },
  fundamental_analysis: {
    description: 'Fundamental analysis metrics',
    keywords: ['pe ratio', 'earnings', 'revenue', 'margin', 'roe', 'debt', 'valuation', 'guidance'],
    examples: ['P/E ratio comparison', 'Earnings growth analysis'],
  },
  order_flow: {
    description: 'Order flow and volume analysis',
    keywords: ['volume profile', 'order flow', 'delta', 'vpoc', 'value area', 'big player', 'accumulation', 'distribution'],
    examples: ['Volume profile analysis', 'Order flow imbalance detection'],
  },
  volume_analysis: {
    description: 'Volume-based trading insights',
    keywords: ['volume', 'turnover', 'volatility', 'breakout volume', 'volume spike', 'obv', 'accumulation distribution'],
    examples: ['Volume breakout confirmation', 'On-balance volume trend'],
  },
  general: {
    description: 'General trading content',
    keywords: ['strategy', 'signal', 'entry', 'exit', 'market', 'trading', 'analysis', 'tip'],
    examples: ['General trading strategy', 'Market analysis note'],
  },
};

// ============================================================================
// Knowledge Entry
// ============================================================================

export interface SourceInfo {
  type: 'book' | 'article' | 'note' | 'image';
  book_title?: string;
  author?: string;
  chapter?: string;
  page_numbers?: string;
  image_path?: string;
  capture_date?: string;
  url?: string;
}

export interface KnowledgeEntry {
  id: string;
  created_at: string;
  updated_at: string;
  source: SourceInfo;
  raw_text: string;
  cleaned_text: string;
  category: Category;
  topics: string[];
  tags: string[];
  quality_score: number;
  ocr_confidence?: number;
  manually_reviewed: boolean;
  training_pairs?: TrainingPair[];
  related_entries?: string[];
}

// ============================================================================
// Training Pair
// ============================================================================

export interface TrainingPair {
  id: string;
  entry_id: string;
  type: 'qa' | 'instruction' | 'reasoning';
  instruction: string;
  input?: string;
  output: string;
  system_prompt?: string;
  quality_score: number;
}

// ============================================================================
// Export Formats
// ============================================================================

export interface AlpacaFormat {
  instruction: string;
  input?: string;
  output: string;
  system_prompt?: string;
}

export interface ShareGPTFormat {
  conversations: Array<{
    from: 'system' | 'human' | 'gpt';
    value: string;
  }>;
}

export interface ChatMLFormat {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============================================================================
// Export/Import Functions
// ============================================================================

export function toAlpacaFormat(pair: TrainingPair): AlpacaFormat {
  const result: AlpacaFormat = {
    instruction: pair.instruction,
    output: pair.output,
  };
  if (pair.input) result.input = pair.input;
  if (pair.system_prompt) result.system_prompt = pair.system_prompt;
  return result;
}

export function toShareGPTFormat(pair: TrainingPair): ShareGPTFormat {
  const conversations: ShareGPTFormat['conversations'] = [];
  
  if (pair.system_prompt) {
    conversations.push({ from: 'system', value: pair.system_prompt });
  }
  
  let userContent = pair.instruction;
  if (pair.input) {
    userContent += `\n\nInput: ${pair.input}`;
  }
  
  conversations.push({ from: 'human', value: userContent });
  conversations.push({ from: 'gpt', value: pair.output });
  
  return { conversations };
}

export function toChatMLFormat(pair: TrainingPair): ChatMLFormat[] {
  const messages: ChatMLFormat[] = [];
  
  if (pair.system_prompt) {
    messages.push({ role: 'system', content: pair.system_prompt });
  }
  
  messages.push({ role: 'user', content: pair.instruction + (pair.input ? `\n\nInput: ${pair.input}` : '') });
  messages.push({ role: 'assistant', content: pair.output });
  
  return messages;
}
