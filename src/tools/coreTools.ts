/**
 * Core Unsloth Tools
 *
 * Defines tools for model loading, fine-tuning, generation, and benchmarking.
 * Uses @lmstudio/sdk tool() function with zod parameter validation.
 *
 * The factory function receives `ctl` (ToolsProviderController) so tool
 * implementations can access plugin configuration via closure.
 */

import { tool, Tool } from '@lmstudio/sdk';
import { z } from 'zod';
import { executeScriptAndGetJson, getPythonExecutable, isVenvAvailable, isAbortError } from '../core/pythonExecutor.js';
import { cache } from '../core/utils/cache.js';
import type { ChatConfigType } from '../config.js';

export function createCoreTools(_chatConfig: ChatConfigType): Tool[] {

  // ============================================================================
  // check_installation
  // ============================================================================

  const checkInstallationTool = tool({
    name: 'check_installation',
    description: 'Check if Unsloth is properly installed in the plugin environment.',
    parameters: {},
    implementation: async () => {
      if (!isVenvAvailable()) {
        return 'Error: Plugin venv not found. Please run setup or reinstall the plugin.';
      }

      try {
        const result = await executeScriptAndGetJson('check_installation.py');
        const installationError = typeof result.error === 'string' ? result.error : undefined;
        if (installationError) {
          return `Unsloth is not installed: ${installationError}`;
        }
        return `Unsloth is properly installed.\n\nPython: ${getPythonExecutable()}\nUnsloth version: ${result.unsloth_version || 'unknown'}\nCUDA available: ${result.cuda_available || false}`;
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error checking installation: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // list_supported_models
  // ============================================================================

  const listSupportedModelsTool = tool({
    name: 'list_supported_models',
    description: 'List all models supported by Unsloth.',
    parameters: {},
    implementation: async (_params, { warn }) => {
      try {
        const cached = cache.get<string[]>('supported_models');
        if (cached) {
          return JSON.stringify(cached, null, 2);
        }
      } catch {
        // fall through to refresh
      }

      const models = [
        "unsloth/Llama-3.3-70B-Instruct-bnb-4bit",
        "unsloth/Llama-3.2-1B-bnb-4bit",
        "unsloth/Llama-3.2-1B-Instruct-bnb-4bit",
        "unsloth/Llama-3.2-3B-bnb-4bit",
        "unsloth/Llama-3.2-3B-Instruct-bnb-4bit",
        "unsloth/Llama-3.1-8B-bnb-4bit",
        "unsloth/Mistral-7B-Instruct-v0.3-bnb-4bit",
        "unsloth/Mistral-Small-Instruct-2409",
        "unsloth/Phi-3.5-mini-instruct",
        "unsloth/Phi-3-medium-4k-instruct",
        "unsloth/gemma-2-9b-bnb-4bit",
        "unsloth/gemma-2-27b-bnb-4bit",
        "unsloth/Qwen-2.5-7B"
      ];

      try {
        cache.set('supported_models', models, 3600);
      } catch {
        warn('Could not persist supported-models cache.');
      }

      return JSON.stringify(models, null, 2);
    },
  });

  // ============================================================================
  // load_model
  // ============================================================================

  const loadModelTool = tool({
    name: 'load_model',
    description: 'Load a pretrained model with Unsloth optimizations.',
    parameters: {
      model_name: z.string().describe('Name of the model to load (e.g., "unsloth/Llama-3.2-1B")'),
      max_seq_length: z.number().optional().describe('Maximum sequence length for the model'),
      load_in_4bit: z.boolean().optional().describe('Whether to load the model in 4-bit quantization'),
      use_gradient_checkpointing: z.boolean().optional().describe('Whether to use gradient checkpointing'),
    },
    implementation: async ({ model_name, max_seq_length = 2048, load_in_4bit = true, use_gradient_checkpointing = true }, { signal, status }) => {
      try {
        status(`Loading model: ${model_name}`);
        const result = await executeScriptAndGetJson('load_model.py', [
          '--model-name', model_name,
          '--max-seq-length', String(max_seq_length),
          '--4bit', String(load_in_4bit),
          '--gradient-checkpointing', String(use_gradient_checkpointing),
        ], { timeout: 300000, signal });

        const loadError = typeof result.error === 'string' ? result.error : undefined;
        if (loadError) {
          return `Error loading model: ${loadError}`;
        }

        return `Successfully loaded model: ${model_name}\n\n${JSON.stringify(result, null, 2)}`;
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error loading model: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // finetune_model
  // ============================================================================

  const finetuneModelTool = tool({
    name: 'finetune_model',
    description: 'Fine-tune a model with Unsloth optimizations.',
    parameters: {
      model_name: z.string().describe('Name of the model to fine-tune'),
      dataset_name: z.string().describe('Name or path of the dataset to use for fine-tuning'),
      output_dir: z.string().describe('Directory to save the fine-tuned model'),
      max_seq_length: z.number().optional(),
      lora_rank: z.number().optional(),
      lora_alpha: z.number().optional(),
      batch_size: z.number().optional(),
      gradient_accumulation_steps: z.number().optional(),
      learning_rate: z.number().optional(),
      max_steps: z.number().optional(),
      dataset_text_field: z.string().optional(),
      load_in_4bit: z.boolean().optional(),
    },
    implementation: async ({
      model_name,
      dataset_name,
      output_dir,
      max_seq_length = 2048,
      lora_rank = 16,
      lora_alpha = 16,
      batch_size = 2,
      gradient_accumulation_steps = 4,
      learning_rate = 2e-4,
      max_steps = 100,
      dataset_text_field = 'text',
      load_in_4bit = true,
    }, { signal, status }) => {
      try {
        status(`Fine-tuning ${model_name} with LoRA (r=${lora_rank})`);
        const result = await executeScriptAndGetJson('finetune_model.py', [
          '--model-name', model_name,
          '--dataset', dataset_name,
          '--output-dir', output_dir,
          '--max-seq-length', String(max_seq_length),
          '--lora-r', String(lora_rank),
          '--lora-alpha', String(lora_alpha),
          '--batch-size', String(batch_size),
          '--grad-accum', String(gradient_accumulation_steps),
          '--learning-rate', String(learning_rate),
          '--max-steps', String(max_steps),
          '--text-field', dataset_text_field,
          '--4bit', String(load_in_4bit),
        ], { timeout: 600000, signal });

        const fintuneError = typeof result.error === 'string' ? result.error : undefined;
        if (fintuneError) {
          return `Error fine-tuning model: ${fintuneError}`;
        }

        return `Successfully fine-tuned model: ${model_name}\n\n${JSON.stringify(result, null, 2)}`;
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error fine-tuning model: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // generate_text
  // ============================================================================

  const generateTextTool = tool({
    name: 'generate_text',
    description: 'Generate text using a fine-tuned Unsloth model.',
    parameters: {
      model_path: z.string().describe('Path to the fine-tuned model'),
      prompt: z.string().describe('Prompt for text generation'),
      max_new_tokens: z.number().optional(),
      temperature: z.number().optional(),
      top_p: z.number().optional(),
    },
    implementation: async ({ model_path, prompt, max_new_tokens = 256, temperature = 0.7, top_p = 0.9 }, { signal, status }) => {
      try {
        status('Generating text...');
        const result = await executeScriptAndGetJson('generate_text.py', [
          '--model-path', model_path,
          '--prompt', prompt,
          '--max-new-tokens', String(max_new_tokens),
          '--temperature', String(temperature),
          '--top-p', String(top_p),
        ], { timeout: 120000, signal });

        const genError = typeof result.error === 'string' ? result.error : undefined;
        if (genError) {
          return `Error generating text: ${genError}`;
        }

        return `Generated text:\n\n${result.generated_text || ''}`;
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error generating text: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // export_model
  // ============================================================================

  const exportModelTool = tool({
    name: 'export_model',
    description: 'Export a fine-tuned Unsloth model to various formats.',
    parameters: {
      model_path: z.string().describe('Path to the fine-tuned model'),
      export_format: z.enum(['gguf', 'ollama', 'vllm', 'huggingface']).describe('Format to export to'),
      output_path: z.string().describe('Path to save the exported model'),
      quantization_bits: z.number().optional().describe('Bits for quantization (for GGUF export)'),
    },
    implementation: async ({ model_path, export_format, output_path, quantization_bits = 4 }, { signal, status }) => {
      try {
        status(`Exporting model to ${export_format}...`);
        const result = await executeScriptAndGetJson('export_model.py', [
          '--model-path', model_path,
          '--format', export_format,
          '--output-path', output_path,
          '--quant-bits', String(quantization_bits),
        ], { timeout: 300000, signal });

        const exportError = typeof result.error === 'string' ? result.error : undefined;
        if (exportError) {
          return `Error exporting model: ${exportError}`;
        }

        return `Successfully exported model to ${export_format} format:\n\n${JSON.stringify(result, null, 2)}`;
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error exporting model: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // train_superbpe_tokenizer
  // ============================================================================

  const trainSuperBpeTokenizerTool = tool({
    name: 'train_superbpe_tokenizer',
    description: 'Train a SuperBPE tokenizer for improved efficiency (up to 33% fewer tokens)',
    parameters: {
      corpus_path: z.string().describe('Path to the training corpus or dataset name'),
      vocab_size: z.number().optional().describe('Vocabulary size for the tokenizer'),
      output_path: z.string().describe('Path to save the trained tokenizer'),
      num_inherit_merges: z.number().optional(),
    },
    implementation: async ({ corpus_path, vocab_size = 50000, output_path, num_inherit_merges }, { signal, status }) => {
      try {
        const inherit_merges = num_inherit_merges || Math.floor(vocab_size * 0.8);
        status(`Training SuperBPE tokenizer (vocab=${vocab_size})...`);
        const result = await executeScriptAndGetJson('train_superbpe.py', [
          '--corpus', corpus_path,
          '--vocab-size', String(vocab_size),
          '--output-path', output_path,
          '--num-herit-merges', String(inherit_merges),
        ], { timeout: 600000, signal });

        const tokenizerError = typeof result.error === 'string' ? result.error : undefined;
        if (tokenizerError) {
          return `Error training tokenizer: ${tokenizerError}`;
        }

        return `Successfully trained SuperBPE tokenizer!\n\n${JSON.stringify(result, null, 2)}`;
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error training tokenizer: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // get_model_info
  // ============================================================================

  const getModelInfoTool = tool({
    name: 'get_model_info',
    description: 'Get detailed information about a model including architecture, parameters, and capabilities.',
    parameters: {
      model_name: z.string().describe('Name or path of the model to inspect'),
    },
    implementation: async ({ model_name }, { signal, status }) => {
      try {
        status(`Getting model info for ${model_name}`);
        const result = await executeScriptAndGetJson('get_model_info.py', [
          '--model-name', model_name,
        ], { timeout: 120000, signal });

        const modelInfoError = typeof result.error === 'string' ? result.error : undefined;
        if (modelInfoError) {
          return `Error getting model info: ${modelInfoError}`;
        }

        return `Model Information for ${model_name}:\n\n${JSON.stringify(result, null, 2)}`;
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error getting model info: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // compare_tokenizers
  // ============================================================================

  const compareTokenizersTool = tool({
    name: 'compare_tokenizers',
    description: 'Compare tokenization efficiency between different tokenizers (BPE vs SuperBPE).',
    parameters: {
      text: z.string().describe('Sample text to tokenize for comparison'),
      tokenizer1_path: z.string().describe('Path to first tokenizer'),
      tokenizer2_path: z.string().describe('Path to second tokenizer'),
    },
    implementation: async ({ text, tokenizer1_path, tokenizer2_path }, { signal, status }) => {
      try {
        status('Comparing tokenizers...');
        const result = await executeScriptAndGetJson('compare_tokenizers.py', [
          '--text', text,
          '--tokenizer1', tokenizer1_path,
          '--tokenizer2', tokenizer2_path,
        ], { timeout: 60000, signal });

        const compareError = typeof result.error === 'string' ? result.error : undefined;
        if (compareError) {
          return `Error comparing tokenizers: ${compareError}`;
        }

        return `Tokenizer Comparison Results:\n\n${JSON.stringify(result, null, 2)}`;
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error comparing tokenizers: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // benchmark_model
  // ============================================================================

  const benchmarkModelTool = tool({
    name: 'benchmark_model',
    description: 'Benchmark model inference speed and memory usage.',
    parameters: {
      model_name: z.string().describe('Name of the model to benchmark'),
      prompt: z.string().describe('Sample prompt for benchmarking'),
      num_iterations: z.number().optional(),
      max_new_tokens: z.number().optional(),
    },
    implementation: async ({ model_name, prompt, num_iterations = 10, max_new_tokens = 128 }, { signal, status }) => {
      try {
        status(`Benchmarking ${model_name}...`);
        const result = await executeScriptAndGetJson('benchmark_model.py', [
          '--model-name', model_name,
          '--prompt', prompt,
          '--iterations', String(num_iterations),
          '--max-new-tokens', String(max_new_tokens),
        ], { timeout: 300000, signal });

        if (
          typeof result === 'object' &&
          result !== null &&
          'error' in result &&
          typeof result.error === 'string'
        ) {
          return `Error benchmarking model: ${result.error}`;
        }

        return `Benchmark Results for ${model_name}:\n\n${JSON.stringify(result, null, 2)}`;
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error benchmarking model: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // list_datasets
  // ============================================================================

  const listDatasetsTool = tool({
    name: 'list_datasets',
    description: 'List popular datasets available for fine-tuning from Hugging Face.',
    parameters: {
      search_query: z.string().optional(),
      limit: z.number().optional(),
    },
    implementation: async ({ search_query = '', limit = 20 }, { signal, status }) => {
      try {
        status('Listing datasets...');
        const result = await executeScriptAndGetJson('list_datasets.py', [
          '--search', search_query,
          '--limit', String(limit),
        ], { timeout: 60000, signal });

        if (
          typeof result === 'object' &&
          result !== null &&
          'error' in result &&
          typeof result.error === 'string'
        ) {
          return `Error listing datasets: ${result.error}`;
        }

        return `Available Datasets${search_query ? ` (search: "${search_query}")` : ''}:\n\n${JSON.stringify(result, null, 2)}`;
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error listing datasets: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // prepare_dataset
  // ============================================================================

  const prepareDatasetTool = tool({
    name: 'prepare_dataset',
    description: 'Prepare and format a dataset for Unsloth fine-tuning.',
    parameters: {
      dataset_name: z.string().describe('Name or path of the dataset to prepare'),
      output_path: z.string().describe('Path to save the prepared dataset'),
      text_field: z.string().optional(),
      format: z.enum(['json', 'jsonl', 'csv']).optional(),
    },
    implementation: async ({ dataset_name, output_path, text_field = 'text', format = 'jsonl' }, { signal, status }) => {
      try {
        status(`Preparing dataset (${format})...`);
        const result = await executeScriptAndGetJson('prepare_dataset.py', [
          '--dataset', dataset_name,
          '--output-path', output_path,
          '--text-field', text_field,
          '--format', format,
        ], { timeout: 120000, signal });

        if (
          typeof result === 'object' &&
          result !== null &&
          'error' in result &&
          typeof result.error === 'string'
        ) {
          return `Error preparing dataset: ${result.error}`;
        }

        return `Successfully prepared dataset:\n\n${JSON.stringify(result, null, 2)}`;
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error preparing dataset: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  return [
    checkInstallationTool,
    listSupportedModelsTool,
    loadModelTool,
    finetuneModelTool,
    generateTextTool,
    exportModelTool,
    trainSuperBpeTokenizerTool,
    getModelInfoTool,
    compareTokenizersTool,
    benchmarkModelTool,
    listDatasetsTool,
    prepareDatasetTool,
  ];
}
