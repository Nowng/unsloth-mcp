/**
 * Unsloth MCP Plugin - Configuration Schematics
 * 
 * Defines the UI configuration schema for LM Studio.
 * Global config applies to all chats (API keys, paths).
 * Per-chat config applies to the current chat only.
 */

import { createConfigSchematics } from '@lmstudio/sdk';

// ============================================================================
// Global Configuration
// Applies to all chats. Used for API keys, paths, global settings.
// ============================================================================

export const globalConfigSchematics = createConfigSchematics()
  .field(
    'pythonPath',
    'string',
    {
      displayName: 'Python Executable Path',
      subtitle: 'Path to the Python executable for Unsloth operations. Leave empty to use venv.',
    },
    '' // Default: use auto-detected venv Python
  )
  .field(
    'runpodApiKey',
    'string',
    {
      displayName: 'RunPod API Key',
      subtitle: 'Your RunPod API key for GPU pod management. (Optional)',
    },
    ''
  )
  .field(
    'huggingfaceToken',
    'string',
    {
      displayName: 'Hugging Face Token',
      subtitle: 'Your Hugging Face token to access private models/datasets. (Optional)',
    },
    ''
  )
  .field(
    'anthropicApiKey',
    'string',
    {
      displayName: 'Anthropic API Key (Claude Vision)',
      subtitle: 'API key for Claude Vision OCR backend. (Optional)',
    },
    ''
  )
  .field(
    'outputDir',
    'string',
    {
      displayName: 'Output Directory',
      subtitle: 'Default directory for saving models, datasets, and exports.',
    },
    './unsloth-output'
  )
  .build();

// ============================================================================
// Per-Chat Configuration
// Applies only to the current chat. Used for tool toggles, limits.
// ============================================================================

export const configSchematics = createConfigSchematics()
  .field(
    'cacheEnabled',
    'boolean',
    {
      displayName: 'Enable Model Cache',
      subtitle: 'Cache supported models list and other results.',
    },
    true
  )
  .field(
    'logLevel',
    'string',
    {
      displayName: 'Log Level',
      subtitle: 'Logging verbosity for tool operations.',
    },
    'info'
  )
  .field(
    'executionTimeout',
    'numeric',
    {
      displayName: 'Execution Timeout (seconds)',
      subtitle: 'Maximum time to wait for Python/Unsloth operations. (0 = unlimited)',
    },
    300
  )
  .build();

// ============================================================================
// Type Exports
// ============================================================================

import type { InferParsedConfig } from '@lmstudio/sdk';

export type GlobalConfigType = InferParsedConfig<typeof globalConfigSchematics>;
export type ChatConfigType = InferParsedConfig<typeof configSchematics>;
