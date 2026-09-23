/**
 * RunPod GPU Management Tools
 *
 * Defines tools for managing RunPod GPU pods and training jobs.
 */

import { tool, Tool } from '@lmstudio/sdk';
import { z } from 'zod';
import { getRunPodClient, resetRunPodClient } from '../core/runpod/client.js';
import { isAbortError } from '../core/pythonExecutor.js';
import type { GlobalConfigType } from '../config.js';

export function createRunPodTools(globalConfig: GlobalConfigType): Tool[] {
  // Helper to get RunPod API key
  const getApiKey = (): string => {
    return (globalConfig?.get('runpodApiKey') as string) || process.env.RUNPOD_API_KEY || '';
  };

  // ============================================================================
  // runpod_list_pods
  // ============================================================================

  const listPodsTool = tool({
    name: 'runpod_list_pods',
    description: 'List all RunPod pods with their status, GPU info, and costs.',
    parameters: {},
    implementation: async (_params, { signal, status, warn }) => {
      try {
        if (!getApiKey()) {
          warn('RUNPOD_API_KEY is not set. List pods may fail.');
        }
        status('Listing RunPod pods...');
        const client = getRunPodClient(getApiKey());
        const pods = await client.listPods(signal);

        const podSummary = pods.map((pod) => ({
          id: pod.id,
          name: pod.name,
          status: pod.desiredStatus,
          gpu: pod.machine?.gpuTypeId,
          gpuCount: pod.gpuCount,
          costPerHr: pod.costPerHr,
          uptime: pod.runtime?.uptimeInSeconds
            ? `${Math.round(pod.runtime.uptimeInSeconds / 60)} minutes`
            : 'stopped',
          gpuUtilization: pod.runtime?.gpus?.[0]?.gpuUtilPercent
            ? `${pod.runtime.gpus[0].gpuUtilPercent}%`
            : 'N/A',
        }));

        return JSON.stringify({ success: true, pods: podSummary }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error listing pods: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // runpod_get_pod
  // ============================================================================

  const getPodTool = tool({
    name: 'runpod_get_pod',
    description: 'Get detailed information about a specific RunPod pod.',
    parameters: {
      pod_id: z.string().describe('The ID of the pod to get info for'),
    },
    implementation: async ({ pod_id }, { signal, status }) => {
      try {
        status(`Fetching pod ${pod_id}`);
        const client = getRunPodClient(getApiKey());
        const pod = await client.getPod(pod_id, signal);

        if (!pod) {
          return JSON.stringify({ success: false, error: `Pod ${pod_id} not found` }, null, 2);
        }

        return JSON.stringify({ success: true, pod }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error getting pod: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // runpod_check_gpus
  // ============================================================================

  const checkGpusTool = tool({
    name: 'runpod_check_gpus',
    description: 'Check available GPU types and their pricing on RunPod.',
    parameters: {
      min_vram_gb: z.number().optional().describe('Minimum VRAM in GB (default: 24)'),
    },
    implementation: async ({ min_vram_gb = 24 }, { signal, status }) => {
      try {
        status('Querying available GPUs...');
        const client = getRunPodClient(getApiKey());
        const gpuTypes = await client.getGpuTypes(signal);

        const available = gpuTypes
          .filter((gpu) => {
            const hasCapacity = gpu.secureCloud || gpu.communityCloud;
            const hasVram = gpu.memoryInGb >= min_vram_gb;
            return hasCapacity && hasVram;
          })
          .map((gpu) => ({
            id: gpu.id,
            name: gpu.displayName,
            vram: `${gpu.memoryInGb}GB`,
            secureCloud: gpu.secureCloud,
            communityCloud: gpu.communityCloud,
          }))
          .sort((a, b) => parseInt(a.vram) - parseInt(b.vram));

        const bestGpu = await client.findBestAvailableGpu(min_vram_gb, signal);

        return JSON.stringify({
          success: true,
          minVramFilter: `${min_vram_gb}GB`,
          availableGpus: available,
          recommendation: bestGpu
            ? `Recommended: ${bestGpu.displayName} (${bestGpu.memoryInGb}GB VRAM)`
            : 'No GPUs available meeting requirements',
        }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error checking GPUs: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // runpod_create_pod
  // ============================================================================

  const createPodTool = tool({
    name: 'runpod_create_pod',
    description: 'Create a new RunPod pod for fine-tuning.',
    parameters: {
      name: z.string().describe('Name for the pod'),
      gpu_type: z.string().describe('GPU type ID (e.g., "NVIDIA RTX A5000")'),
      gpu_count: z.number().optional().describe('Number of GPUs (default: 1)'),
      volume_gb: z.number().optional().describe('Volume size in GB (default: 30)'),
      image: z.string().optional().describe('Docker image (default: pytorch with CUDA)'),
    },
    implementation: async ({ name, gpu_type, gpu_count = 1, volume_gb = 30, image }, { signal, status }) => {
      try {
        status(`Checking availability of GPU ${gpu_type}`);
        const client = getRunPodClient(getApiKey());

        const availability = await client.checkGpuAvailability(gpu_type, signal);
        if (!availability.available) {
          const bestAlt = await client.findBestAvailableGpu(24, signal);
          return JSON.stringify({
            success: false,
            error: `GPU type ${gpu_type} is not available`,
            suggestion: bestAlt
              ? `Try ${bestAlt.displayName} instead (${bestAlt.memoryInGb}GB VRAM)`
              : 'No suitable GPUs available right now',
          }, null, 2);
        }

        status(`Creating pod ${name}...`);
        const pod = await client.createPod({
          name,
          gpuTypeId: gpu_type,
          gpuCount: gpu_count,
          volumeInGb: volume_gb,
          imageName: image,
        }, signal);

        return JSON.stringify({
          success: true,
          message: `Pod ${pod.name} created successfully`,
          pod: {
            id: pod.id,
            name: pod.name,
            status: pod.desiredStatus,
            costPerHr: pod.costPerHr,
          },
        }, null, 2);
      } catch (error) {
        resetRunPodClient();
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error creating pod: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // runpod_start_pod
  // ============================================================================

  const startPodTool = tool({
    name: 'runpod_start_pod',
    description: 'Start a stopped RunPod pod.',
    parameters: {
      pod_id: z.string().describe('The ID of the pod to start'),
    },
    implementation: async ({ pod_id }, { signal, status }) => {
      try {
        status(`Starting pod ${pod_id}`);
        const client = getRunPodClient(getApiKey());
        const pod = await client.startPod(pod_id, undefined, signal);

        return JSON.stringify({
          success: true,
          message: `Pod ${pod.name} starting`,
          pod: {
            id: pod.id,
            name: pod.name,
            status: pod.desiredStatus,
            costPerHr: pod.costPerHr,
          },
        }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error starting pod: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // runpod_stop_pod
  // ============================================================================

  const stopPodTool = tool({
    name: 'runpod_stop_pod',
    description: 'Stop a running RunPod pod (keeps volume data).',
    parameters: {
      pod_id: z.string().describe('The ID of the pod to stop'),
    },
    implementation: async ({ pod_id }, { signal, status }) => {
      try {
        status(`Stopping pod ${pod_id}`);
        const client = getRunPodClient(getApiKey());
        const pod = await client.stopPod(pod_id, signal);

        return JSON.stringify({
          success: true,
          message: `Pod ${pod.name} stopped. Volume data preserved.`,
          pod: {
            id: pod.id,
            name: pod.name,
            status: pod.desiredStatus,
          },
        }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error stopping pod: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // runpod_terminate_pod
  // ============================================================================

  const terminatePodTool = tool({
    name: 'runpod_terminate_pod',
    description: 'Terminate a RunPod pod (deletes everything including volume).',
    parameters: {
      pod_id: z.string().describe('The ID of the pod to terminate'),
      confirm: z.boolean().describe('Must be true to confirm termination'),
    },
    implementation: async ({ pod_id, confirm }, { signal, status, warn }) => {
      if (!confirm) {
        warn('Termination requires confirm=true. This will permanently delete the pod.');
        return JSON.stringify({
          success: false,
          error: 'Termination not confirmed. Set confirm=true to proceed.',
          warning: 'This will permanently delete the pod and all its data!',
        }, null, 2);
      }

      try {
        status(`Terminating pod ${pod_id} (this is irreversible)`);
        const client = getRunPodClient(getApiKey());
        await client.terminatePod(pod_id, signal);

        return JSON.stringify({
          success: true,
          message: `Pod ${pod_id} terminated. All data has been deleted.`,
        }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error terminating pod: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // runpod_start_training
  // ============================================================================

  const startTrainingTool = tool({
    name: 'runpod_start_training',
    description: 'Start a fine-tuning job on a RunPod pod.',
    parameters: {
      pod_id: z.string().describe('The ID of the pod to run training on'),
      base_model: z.string().describe('Base model to fine-tune (e.g., "unsloth/Llama-3.2-1B")'),
      dataset_path: z.string().describe('Path to training dataset (JSON/JSONL)'),
      output_dir: z.string().describe('Output directory for the model'),
      lora_r: z.number().optional().describe('LoRA rank (default: 16)'),
      lora_alpha: z.number().optional().describe('LoRA alpha (default: 32)'),
      learning_rate: z.number().optional().describe('Learning rate (default: 2e-4)'),
      epochs: z.number().optional().describe('Number of training epochs (default: 3)'),
      batch_size: z.number().optional().describe('Batch size (default: 4)'),
      max_seq_length: z.number().optional().describe('Maximum sequence length (default: 2048)'),
    },
    implementation: async ({
      pod_id,
      base_model,
      dataset_path,
      output_dir,
      lora_r,
      lora_alpha,
      learning_rate,
      epochs,
      batch_size,
      max_seq_length,
    }, { signal, status }) => {
      try {
        status(`Verifying pod ${pod_id} is running`);
        const client = getRunPodClient(getApiKey());

        const pod = await client.getPod(pod_id, signal);
        if (!pod || !pod.runtime) {
          return JSON.stringify({
            success: false,
            error: `Pod ${pod_id} is not running. Start it first with runpod_start_pod.`,
          }, null, 2);
        }

        status('Starting training job');
        const job = await client.startTrainingJob(pod_id, {
          baseModel: base_model,
          datasetPath: dataset_path,
          outputDir: output_dir,
          loraR: lora_r,
          loraAlpha: lora_alpha,
          learningRate: learning_rate,
          epochs: epochs,
          batchSize: batch_size,
          maxSeqLength: max_seq_length,
        }, signal);

        return JSON.stringify({
          success: true,
          message: 'Training job started',
          job: {
            id: job.id,
            status: job.status,
            baseModel: base_model,
            outputDir: output_dir,
          },
          nextSteps: [
            'Use runpod_get_training_status to monitor progress',
            'Use runpod_get_training_logs to view training output',
          ],
        }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error starting training: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // runpod_get_training_status
  // ============================================================================

  const getTrainingStatusTool = tool({
    name: 'runpod_get_training_status',
    description: 'Get the status and progress of a training job.',
    parameters: {
      pod_id: z.string().describe('The ID of the pod running training'),
    },
    implementation: async ({ pod_id }, { signal, status }) => {
      try {
        status('Fetching training status');
        const client = getRunPodClient(getApiKey());
        const statusData = await client.getTrainingStatus(pod_id, signal);

        return JSON.stringify({ success: true, training: statusData }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error getting training status: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // runpod_get_training_logs
  // ============================================================================

  const getTrainingLogsTool = tool({
    name: 'runpod_get_training_logs',
    description: 'Get training logs from a RunPod pod.',
    parameters: {
      pod_id: z.string().describe('The ID of the pod'),
      lines: z.number().optional().describe('Number of log lines to retrieve (default: 100)'),
    },
    implementation: async ({ pod_id, lines = 100 }, { signal, status }) => {
      try {
        status('Fetching training logs');
        const client = getRunPodClient(getApiKey());
        const logs = await client.getTrainingLogs(pod_id, lines, signal);

        return JSON.stringify({ success: true, logs }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error getting training logs: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // runpod_estimate_cost
  // ============================================================================

  const estimateCostTool = tool({
    name: 'runpod_estimate_cost',
    description: 'Estimate the cost of a fine-tuning job.',
    parameters: {
      dataset_tokens: z.number().describe('Total tokens in the dataset'),
      base_model: z.string().describe('Base model name'),
      gpu_cost_per_hour: z.number().optional().describe('GPU cost per hour (default: 0.16)'),
      epochs: z.number().optional().describe('Number of epochs (default: 3)'),
    },
    implementation: async ({ dataset_tokens, base_model, gpu_cost_per_hour = 0.16, epochs }, { status }) => {
      try {
        status('Estimating cost');
        const client = getRunPodClient(getApiKey());
        const estimate = client.estimateTrainingCost(dataset_tokens, base_model, gpu_cost_per_hour, epochs);

        return JSON.stringify({
          success: true,
          estimate: {
            ...estimate,
            datasetTokens: dataset_tokens,
            baseModel: base_model,
            epochs,
            gpuCostPerHour: gpu_cost_per_hour,
            summary: `Estimated ${estimate.estimatedHours} hours at $${gpu_cost_per_hour}/hr = $${estimate.estimatedCost}`,
          },
        }, null, 2);
      } catch (error) {
        if (isAbortError(error)) {
          return 'Error: Operation was aborted by the user.';
        }
        return `Error estimating cost: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  return [
    listPodsTool,
    getPodTool,
    checkGpusTool,
    createPodTool,
    startPodTool,
    stopPodTool,
    terminatePodTool,
    startTrainingTool,
    getTrainingStatusTool,
    getTrainingLogsTool,
    estimateCostTool,
  ];
}
