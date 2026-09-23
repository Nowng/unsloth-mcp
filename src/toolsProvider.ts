/**
 * Unsloth MCP Plugin - Tools Provider
 *
 * Defines all MCP tools for LM Studio.
 * Uses the @lmstudio/sdk tool() function with zod parameter validation.
 */

import { tool, Tool, ToolsProviderController } from '@lmstudio/sdk';
import { configSchematics, globalConfigSchematics, ChatConfigType, GlobalConfigType } from './config.js';
import { createCoreTools } from './tools/coreTools.js';
import { createKnowledgeTools } from './tools/knowledgeTools.js';
import { createRunPodTools } from './tools/runpodTools.js';
import { createAdminTools } from './tools/adminTools.js';

export async function toolsProvider(ctl: ToolsProviderController): Promise<Tool[]> {
  // Resolve configuration (accessible to all tool implementations via closure)
  const chatConfig: ChatConfigType = ctl.getPluginConfig(configSchematics);
  const globalConfig: GlobalConfigType = ctl.getGlobalPluginConfig(globalConfigSchematics);

  // Build the sub-teams of tools first so we can report an accurate count.
  const coreTools = createCoreTools(chatConfig);
  const knowledgeTools = createKnowledgeTools(chatConfig);
  const runpodTools = createRunPodTools(globalConfig);
  const adminTools = createAdminTools();

  // Total tool count is computed dynamically to avoid drift from the true number.
  const baseToolCount = coreTools.length + knowledgeTools.length + runpodTools.length + adminTools.length;

  // ============================================================================
  // System Information Tool
  // ============================================================================

  const systemInfoTool = tool({
    name: 'plugin_system_info',
    description: 'Get information about the Unsloth plugin environment and system status.',
    parameters: {},
    implementation: async (_params, { status }) => {
      try {
        status('Gathering plugin environment information');
        const { isVenvAvailable, getPythonExecutable } = await import('./core/pythonExecutor.js');
        const { metricsCollector } = await import('./core/utils/metrics.js');

        const stats = metricsCollector.getStats();

        return JSON.stringify({
          plugin: 'unsloth-mcp-server',
          version: '2.3.0',
          python_environment: isVenvAvailable() ? 'venv' : 'system',
          python_path: getPythonExecutable(),
          tools_loaded: 1 + baseToolCount, // +1 for this tool
          metrics: stats,
        }, null, 2);
      } catch (error) {
        return `Error gathering system info: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // Combine all tools (35 MCP tools + plugin_system_info = 36 total)
  // ============================================================================

  const tools: Tool[] = [
    systemInfoTool,
    ...coreTools,
    ...knowledgeTools,
    ...runpodTools,
    ...adminTools,
  ];

  return tools;
}
