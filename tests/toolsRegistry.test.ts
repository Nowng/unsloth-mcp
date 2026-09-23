/**
 * Integration-style tests verifying the tool registry.
 *
 * Each tool factory is invoked with a lightweight mock config object that
 * implements the ParsedConfig.get() interface, so we can assert on the full
 * set of tools exposed by the plugin without instantiating the LM Studio SDK.
 */
import { describe, it, expect } from '@jest/globals';
import { createCoreTools } from '../src/tools/coreTools.js';
import { createKnowledgeTools } from '../src/tools/knowledgeTools.js';
import { createRunPodTools } from '../src/tools/runpodTools.js';
import { createAdminTools } from '../src/tools/adminTools.js';
import type { ChatConfigType, GlobalConfigType } from '../src/config.js';

function makeChatConfig(): ChatConfigType {
  return {
    get: (key: string) => {
      const store: Record<string, unknown> = {
        cacheEnabled: true,
        logLevel: 'info',
        executionTimeout: 300,
      };
      return store[key];
    },
  } as unknown as ChatConfigType;
}

function makeGlobalConfig(): GlobalConfigType {
  return {
    get: (key: string) => {
      const store: Record<string, unknown> = {
        pythonPath: '',
        runpodApiKey: '',
        huggingfaceToken: '',
        anthropicApiKey: '',
        outputDir: './unsloth-output',
      };
      return store[key];
    },
  } as unknown as GlobalConfigType;
}

describe('tool factory registry', () => {
  const core = createCoreTools(makeChatConfig());
  const knowledge = createKnowledgeTools(makeChatConfig());
  const runpod = createRunPodTools(makeGlobalConfig());
  const admin = createAdminTools();

  const allTools = [...core, ...knowledge, ...runpod, ...admin];

  it('should register a total of 35 tools', () => {
    expect(allTools.length).toBe(35);
  });

  it('each tool must expose a name and description', () => {
    for (const t of allTools) {
      expect(typeof t.name).toBe('string');
      expect(t.name.length).toBeGreaterThan(0);
      expect(typeof (t as any).description).toBe('string');
    }
  });

  // ---- Core Unsloth tools (12) ----
  it('exposes all core Unsloth tools', () => {
    const names = core.map(t => t.name);
    const expected = [
      'check_installation',
      'list_supported_models',
      'load_model',
      'finetune_model',
      'generate_text',
      'export_model',
      'train_superbpe_tokenizer',
      'get_model_info',
      'compare_tokenizers',
      'benchmark_model',
      'list_datasets',
      'prepare_dataset',
    ];
    for (const e of expected) {
      expect(names).toContain(e);
    }
  });

  // ---- Knowledge base tools (10) ----
  it('exposes all knowledge base tools', () => {
    const names = knowledge.map(t => t.name);
    const expected = [
      'process_book_image',
      'batch_process_images',
      'search_knowledge',
      'list_knowledge_by_category',
      'get_knowledge_entry',
      'generate_training_pairs',
      'export_training_data',
      'knowledge_stats',
      'check_ocr_backends',
      'list_categories',
    ];
    for (const e of expected) {
      expect(names).toContain(e);
    }
  });

  // ---- RunPod tools (11) ----
  it('exposes all RunPod GPU management tools', () => {
    const names = runpod.map(t => t.name);
    const expected = [
      'runpod_list_pods',
      'runpod_get_pod',
      'runpod_check_gpus',
      'runpod_create_pod',
      'runpod_start_pod',
      'runpod_stop_pod',
      'runpod_terminate_pod',
      'runpod_start_training',
      'runpod_get_training_status',
      'runpod_get_training_logs',
      'runpod_estimate_cost',
    ];
    for (const e of expected) {
      expect(names).toContain(e);
    }
  });

  // ---- Admin tools (2) ----
  it('exposes cost and checkpoint admin tools', () => {
    const names = admin.map(t => t.name);
    expect(names).toEqual(expect.arrayContaining(['cost_dashboard', 'checkpoint_resume']));
  });

  it('no two tools should share the same name', () => {
    const names = allTools.map(t => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});
