/**
 * Integration test exercising the real toolsProvider entrypoint.
 *
 * Verifies that the plugin registers all 35 original MCP tools (plus the
 * bonus plugin_system_info health check) with unique names.
 */
import { describe, it, expect } from '@jest/globals';
import { toolsProvider } from '../src/toolsProvider.js';

// Minimal ToolsProviderController mock implementing the config accessors.
function makeController() {
  const chatStore: Record<string, unknown> = {
    cacheEnabled: true,
    logLevel: 'info',
    executionTimeout: 300,
  };
  const globalStore: Record<string, unknown> = {
    pythonPath: '',
    runpodApiKey: '',
    huggingfaceToken: '',
    anthropicApiKey: '',
    outputDir: './unsloth-output',
  };
  return {
    getPluginConfig: () => ({ get: (k: string) => chatStore[k] }),
    getGlobalPluginConfig: () => ({ get: (k: string) => globalStore[k] }),
  } as any;
}

describe('toolsProvider (full integration)', () => {
  let tools: any[];

  beforeAll(async () => {
    tools = await toolsProvider(makeController());
  });

  it('registers 36 tools total (35 originals + plugin_system_info)', () => {
    expect(tools.length).toBe(36);
  });

  it('all tool names are unique', () => {
    const names = tools.map(t => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('every tool has a non-empty name and description and an implementation', () => {
    for (const t of tools) {
      expect(typeof t.name).toBe('string');
      expect(t.name.length).toBeGreaterThan(0);
      expect(typeof t.description).toBe('string');
      expect(t.description.length).toBeGreaterThan(0);
      expect(typeof t.implementation).toBe('function');
    }
  });

  it('includes all 35 original MCP tools', () => {
    const names = tools.map(t => t.name);
    const expected = [
      // Core Unsloth (12)
      'check_installation', 'list_supported_models', 'load_model', 'finetune_model',
      'generate_text', 'export_model', 'train_superbpe_tokenizer', 'get_model_info',
      'compare_tokenizers', 'benchmark_model', 'list_datasets', 'prepare_dataset',
      // Knowledge base (10)
      'process_book_image', 'batch_process_images', 'search_knowledge',
      'list_knowledge_by_category', 'get_knowledge_entry', 'generate_training_pairs',
      'export_training_data', 'knowledge_stats', 'check_ocr_backends', 'list_categories',
      // RunPod GPU management (11)
      'runpod_list_pods', 'runpod_get_pod', 'runpod_check_gpus', 'runpod_create_pod',
      'runpod_start_pod', 'runpod_stop_pod', 'runpod_terminate_pod', 'runpod_start_training',
      'runpod_get_training_status', 'runpod_get_training_logs', 'runpod_estimate_cost',
      // Admin (2)
      'cost_dashboard', 'checkpoint_resume',
    ];
    for (const e of expected) {
      expect(names).toContain(e);
    }
  });

  it('includes the bonus plugin_system_info tool', () => {
    const names = tools.map(t => t.name);
    expect(names).toContain('plugin_system_info');
  });

  it('plugin_system_info reports the tool count when invoked', async () => {
    const info = tools.find(t => t.name === 'plugin_system_info');
    expect(info).toBeDefined();
    const output = await info!.implementation({}, { status: () => {}, warn: () => {}, signal: null as any });
    const parsed = JSON.parse(output);
    expect(parsed.tools_loaded).toBe(36);
    expect(typeof parsed.python_path).toBe('string');
  });
});
