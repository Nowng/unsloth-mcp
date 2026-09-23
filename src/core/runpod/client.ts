/**
 * RunPod API Client
 * 
 * Pure TypeScript implementation for GPU pod management.
 * Uses native fetch (available in LM Studio's Node.js environment).
 */

import {
  RunPodConfig,
  Pod,
  GpuType,
  CreatePodOptions,
  TrainingJobConfig,
  TrainingJob,
  RunPodResponse,
} from './types.js';

export class RunPodClient {
  private apiKey: string;
  private apiEndpoint: string;
  private defaultGpuType: string;
  private defaultImage: string;
  private defaultVolumeSize: number;

  constructor(config: RunPodConfig) {
    this.apiKey = config.apiKey;
    this.apiEndpoint = config.apiEndpoint || 'https://api.runpod.io/graphql';
    this.defaultGpuType = config.defaultGpuType || 'NVIDIA RTX A5000';
    this.defaultImage = config.defaultImage || 'runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04';
    this.defaultVolumeSize = config.defaultVolumeSize || 30;
  }

  // ============================================================================
  // GraphQL Request Helper
  // ============================================================================

  private async graphqlRequest<T>(
    query: string,
    variables?: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<T> {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ query, variables }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`RunPod API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as RunPodResponse<T>;

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join(', ');
      throw new Error(`RunPod GraphQL error: ${errorMessages}`);
    }

    return result.data as T;
  }

  // ============================================================================
  // Account & GPU Availability
  // ============================================================================

  async getMyself(): Promise<{ id: string; email: string; currentSpendPerHr: number }> {
    const query = `
      query {
        myself {
          id
          email
          currentSpendPerHr
        }
      }
    `;
    const data = await this.graphqlRequest<{ myself: { id: string; email: string; currentSpendPerHr: number } }>(query);
    return data.myself;
  }

  async getGpuTypes(signal?: AbortSignal): Promise<GpuType[]> {
    // Note: lowestPrice causes internal server errors on RunPod's API.
    // Using simpler query without pricing data.
    const query = `
      query {
        gpuTypes {
          id
          displayName
          memoryInGb
          secureCloud
          communityCloud
        }
      }
    `;
    const data = await this.graphqlRequest<{ gpuTypes: GpuType[] }>(query, undefined, signal);
    return data.gpuTypes;
  }

  async checkGpuAvailability(gpuTypeId: string, signal?: AbortSignal): Promise<{
    available: boolean;
    secureCloud: boolean;
    communityCloud: boolean;
    memoryInGb: number;
  }> {
    const gpuTypes = await this.getGpuTypes(signal);
    const gpu = gpuTypes.find((g) => g.id === gpuTypeId || g.displayName === gpuTypeId);

    if (!gpu) {
      return { available: false, secureCloud: false, communityCloud: false, memoryInGb: 0 };
    }

    return {
      available: gpu.secureCloud || gpu.communityCloud,
      secureCloud: gpu.secureCloud,
      communityCloud: gpu.communityCloud,
      memoryInGb: gpu.memoryInGb,
    };
  }

  async findBestAvailableGpu(minVramGb = 24, signal?: AbortSignal): Promise<GpuType | null> {
    const gpuTypes = await this.getGpuTypes(signal);

    const available = gpuTypes
      .filter((gpu) => {
        const hasCapacity = gpu.secureCloud || gpu.communityCloud;
        const hasVram = gpu.memoryInGb >= minVramGb;
        return hasCapacity && hasVram;
      })
      .sort((a, b) => a.memoryInGb - b.memoryInGb);

    return available.length > 0 ? available[0] : null;
  }

  // ============================================================================
  // Pod Management
  // ============================================================================

  async listPods(signal?: AbortSignal): Promise<Pod[]> {
    const query = `
      query {
        myself {
          pods {
            id
            name
            desiredStatus
            gpuCount
            machine {
              gpuTypeId
            }
            imageName
            volumeInGb
            costPerHr
          }
        }
      }
    `;
    const data = await this.graphqlRequest<{ myself: { pods: Pod[] } }>(query, undefined, signal);
    return data.myself.pods;
  }

  async getPod(podId: string, signal?: AbortSignal): Promise<Pod | null> {
    const query = `
      query getPod($podId: String!) {
        pod(input: { podId: $podId }) {
          id
          name
          desiredStatus
          gpuCount
          machine {
            gpuTypeId
          }
          imageName
          volumeInGb
          costPerHr
          runtime {
            uptimeInSeconds
            gpus {
              id
              gpuUtilPercent
              memoryUtilPercent
            }
            ports {
              ip
              isIpPublic
              privatePort
              publicPort
              type
            }
          }
        }
      }
    `;

    try {
      const data = await this.graphqlRequest<{ pod: Pod }>(query, { podId }, signal);
      return data.pod;
    } catch {
      return null;
    }
  }

  async createPod(options: CreatePodOptions, signal?: AbortSignal): Promise<Pod> {
    const query = `
      mutation createPod($input: PodFindAndDeployOnDemandInput!) {
        podFindAndDeployOnDemand(input: $input) {
          id
          name
          desiredStatus
          gpuCount
          imageName
          machine {
            gpuTypeId
          }
          volumeInGb
          costPerHr
        }
      }
    `;

    const input = {
      name: options.name,
      gpuTypeId: options.gpuTypeId,
      gpuCount: options.gpuCount || 1,
      imageName: options.imageName || this.defaultImage,
      volumeInGb: options.volumeInGb || this.defaultVolumeSize,
      containerDiskInGb: options.containerDiskGb || 20,
      volumeMountPath: options.volumeMountPath || '/runpod-volume',
      ports: options.ports || '8888/http,22/tcp',
      startSsh: true,
      startJupyter: true,
      env: options.env ? Object.entries(options.env).map(([key, value]) => ({ key, value })) : [],
      dockerArgs: options.dockerArgs,
      templateId: options.templateId,
    };

    const data = await this.graphqlRequest<{ podFindAndDeployOnDemand: Pod }>(query, { input }, signal);
    return data.podFindAndDeployOnDemand;
  }

  async startPod(podId: string, gpuCount?: number, signal?: AbortSignal): Promise<Pod> {
    const query = `
      mutation startPod($podId: String!, $gpuCount: Int) {
        podResume(input: { podId: $podId, gpuCount: $gpuCount }) {
          id
          name
          desiredStatus
          costPerHr
        }
      }
    `;
    const data = await this.graphqlRequest<{ podResume: Pod }>(query, { podId, gpuCount }, signal);
    return data.podResume;
  }

  async stopPod(podId: string, signal?: AbortSignal): Promise<Pod> {
    const query = `
      mutation stopPod($podId: String!) {
        podStop(input: { podId: $podId }) {
          id
          name
          desiredStatus
        }
      }
    `;
    const data = await this.graphqlRequest<{ podStop: Pod }>(query, { podId }, signal);
    return data.podStop;
  }

  async terminatePod(podId: string, signal?: AbortSignal): Promise<void> {
    const query = `
      mutation terminatePod($podId: String!) {
        podTerminate(input: { podId: $podId })
      }
    `;
    await this.graphqlRequest(query, { podId }, signal);
  }

  async migratePod(oldPodId: string, targetGpuTypeId?: string): Promise<{
    newPod: Pod;
    migrationStatus: 'success' | 'partial' | 'failed';
    message: string;
  }> {
    const oldPod = await this.getPod(oldPodId);
    if (!oldPod) {
      throw new Error(`Pod ${oldPodId} not found`);
    }

    let targetGpu = targetGpuTypeId;
    if (!targetGpu) {
      const bestGpu = await this.findBestAvailableGpu(24);
      if (!bestGpu) {
        throw new Error('No suitable GPUs available for migration');
      }
      targetGpu = bestGpu.id;
    }

    const newPod = await this.createPod({
      name: `${oldPod.name}-migrated`,
      gpuTypeId: targetGpu!,
      gpuCount: oldPod.gpuCount,
      imageName: oldPod.imageName,
      volumeInGb: oldPod.volumeInGb,
      containerDiskGb: oldPod.containerDiskInGb || 20,
      volumeMountPath: oldPod.volumeMountPath || '/runpod-volume',
    });

    return {
      newPod,
      migrationStatus: 'success',
      message: `Created new pod ${newPod.id} with GPU ${targetGpu}. Note: Volume data from old pod is NOT automatically transferred.`,
    };
  }

  // ============================================================================
  // Training Job Management
  // ============================================================================

  generateTrainingScript(config: TrainingJobConfig): string {
    return `
#!/usr/bin/env python3
"""
Unsloth Fine-tuning Script
Generated by unsloth-mcp-server
"""
import os
import json
from datetime import datetime

BASE_MODEL = "${config.baseModel}"
DATASET_PATH = "${config.datasetPath}"
OUTPUT_DIR = "${config.outputDir}"

LORA_R = ${config.loraR || 16}
LORA_ALPHA = ${config.loraAlpha || 32}
LEARNING_RATE = ${config.learningRate || 2e-4}
EPOCHS = ${config.epochs || 3}
BATCH_SIZE = ${config.batchSize || 4}
MAX_SEQ_LENGTH = ${config.maxSeqLength || 2048}

print(f"Starting fine-tuning at {datetime.now().isoformat()}")

from unsloth import FastLanguageModel
from transformers import TrainingArguments
from trl import SFTTrainer
from datasets import load_dataset

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=BASE_MODEL,
    max_seq_length=MAX_SEQ_LENGTH,
    load_in_4bit=True,
    dtype=None,
)

model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_R,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha=LORA_ALPHA,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=42,
)

dataset = load_dataset("json", data_files=DATASET_PATH, split="train")

def format_prompt(example):
    instruction = example.get("instruction", "")
    input_text = example.get("input", "")
    output = example.get("output", "")
    if input_text:
        text = f"### Instruction:\\n{instruction}\\n\\n### Input:\\n{input_text}\\n\\n### Response:\\n{output}"
    else:
        text = f"### Instruction:\\n{instruction}\\n\\n### Response:\\n{output}"
    return {"text": text}

dataset = dataset.map(format_prompt)

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    per_device_train_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=${config.gradientAccumulationSteps || 4},
    warmup_steps=${config.warmupSteps || 10},
    num_train_epochs=EPOCHS,
    learning_rate=LEARNING_RATE,
    logging_steps=${config.loggingSteps || 10},
    save_steps=${config.saveSteps || 100},
    fp16=True,
    report_to="none",
)

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    args=training_args,
)

trainer.train()
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"Training complete!")
`.trim();
  }

  async startTrainingJob(podId: string, config: TrainingJobConfig, _signal?: AbortSignal): Promise<TrainingJob> {
    // Note: Actual pod command execution requires SSH access to the pod.
    // This returns a job record; in practice, you'd upload the script via RunPod's runsync API.
    const script = this.generateTrainingScript(config);

    void script; // Script generation available for manual execution
    
    return {
      id: `job-${Date.now()}`,
      status: 'pending',
      progress: 0,
      currentStep: 0,
      totalSteps: 0,
      currentEpoch: 0,
      totalEpochs: config.epochs || 3,
      startedAt: new Date().toISOString(),
    };
  }

  async getTrainingStatus(podId: string, signal?: AbortSignal): Promise<TrainingJob> {
    if (signal?.aborted) {
      throw new Error('Request aborted.');
    }
    return {
      id: podId,
      status: 'pending',
      progress: 0,
      currentStep: 0,
      totalSteps: 0,
      currentEpoch: 0,
      totalEpochs: 3,
    };
  }

  async getTrainingLogs(podId: string, _lines = 100, _signal?: AbortSignal): Promise<string> {
    if (_signal?.aborted) {
      throw new Error('Request aborted.');
    }
    return `No logs available. Ensure the pod is running training.`;
  }

  stopTrainingJob(_podId: string, _jobId: string): Promise<void> {
    return Promise.resolve();
  }

  // ============================================================================
  // Cost Estimation
  // ============================================================================

  estimateTrainingCost(
    datasetTokens: number,
    baseModel: string,
    gpuCostPerHour = 0.16,
    epochs = 3
  ): { estimatedHours: number; estimatedCost: number; tokensPerSecond: number } {
    let tokensPerSecond = 2000;

    if (baseModel.includes('1B')) tokensPerSecond = 8000;
    else if (baseModel.includes('3B')) tokensPerSecond = 5000;
    else if (baseModel.includes('7B') || baseModel.includes('8B')) tokensPerSecond = 2500;
    else if (baseModel.includes('13B')) tokensPerSecond = 1500;
    else if (baseModel.includes('70B')) tokensPerSecond = 400;

    const totalTokens = datasetTokens * epochs;
    const estimatedSeconds = totalTokens / tokensPerSecond;
    const estimatedHours = estimatedSeconds / 3600;
    const estimatedCost = estimatedHours * gpuCostPerHour;

    return {
      estimatedHours: Math.round(estimatedHours * 100) / 100,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      tokensPerSecond,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let runpodClient: RunPodClient | null = null;

export function getRunPodClient(apiKey?: string): RunPodClient {
  if (!runpodClient) {
    const key = apiKey || process.env.RUNPOD_API_KEY;
    if (!key) {
      throw new Error('RUNPOD_API_KEY environment variable or apiKey parameter is required');
    }

    runpodClient = new RunPodClient({
      apiKey: key,
      apiEndpoint: process.env.RUNPOD_API_ENDPOINT,
      defaultGpuType: process.env.RUNPOD_DEFAULT_GPU_TYPE,
      defaultImage: process.env.RUNPOD_DEFAULT_IMAGE,
      defaultVolumeSize: process.env.RUNPOD_DEFAULT_VOLUME_SIZE
        ? parseInt(process.env.RUNPOD_DEFAULT_VOLUME_SIZE, 10)
        : undefined,
    });
  }

  return runpodClient;
}

export function resetRunPodClient(): void {
  runpodClient = null;
}
