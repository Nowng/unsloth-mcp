/**
 * RunPod Client - Type Definitions
 * 
 * Pure TypeScript implementation for RunPod GPU pod management.
 */

// ============================================================================
// Config
// ============================================================================

export interface RunPodConfig {
  apiKey: string;
  apiEndpoint?: string;
  defaultGpuType?: string;
  defaultImage?: string;
  defaultVolumeSize?: number;
}

// ============================================================================
// Pod Types
// ============================================================================

export interface Pod {
  id: string;
  name: string;
  desiredStatus: 'RUNNING' | 'EXITED' | 'STOPPED' | 'TERMINATED';
  runtime?: {
    uptimeInSeconds: number;
    gpus: Array<{
      id: string;
      gpuUtilPercent: number;
      memoryUtilPercent: number;
    }>;
    ports: Array<{
      ip: string;
      isIpPublic: boolean;
      privatePort: number;
      publicPort: number;
      type: string;
    }>;
  };
  machine: {
    gpuTypeId: string;
  };
  gpuCount: number;
  imageName: string;
  volumeInGb: number;
  containerDiskInGb?: number;
  costPerHr: number;
  vcpuCount?: number;
  memoryInGb?: number;
  volumeMountPath?: string;
}

export interface GpuType {
  id: string;
  displayName: string;
  memoryInGb: number;
  secureCloud: boolean;
  communityCloud: boolean;
}

export interface CreatePodOptions {
  name: string;
  gpuTypeId: string;
  gpuCount?: number;
  imageName?: string;
  volumeInGb?: number;
  containerDiskGb?: number;
  volumeMountPath?: string;
  ports?: string;
  env?: Record<string, string>;
  dockerArgs?: string;
  templateId?: string;
}

// ============================================================================
// Training Job Types
// ============================================================================

export interface TrainingJobConfig {
  baseModel: string;
  datasetPath: string;
  outputDir: string;
  loraR?: number;
  loraAlpha?: number;
  learningRate?: number;
  epochs?: number;
  batchSize?: number;
  maxSeqLength?: number;
  gradientAccumulationSteps?: number;
  warmupSteps?: number;
  saveSteps?: number;
  loggingSteps?: number;
}

export interface TrainingJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep: number;
  totalSteps: number;
  currentEpoch: number;
  totalEpochs: number;
  trainingLoss?: number;
  evalLoss?: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface RunPodResponse<T> {
  data?: T;
  errors?: Array<{ message: string; locations?: Array<{ line: number; column: number }> }>;
}
