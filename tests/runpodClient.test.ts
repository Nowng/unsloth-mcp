/**
 * Tests for the pure logic in the RunPod API client.
 * Network calls (graphqlRequest) are mocked by overriding getGpuTypes.
 */
import { describe, it, expect } from '@jest/globals';
import { RunPodClient } from '../src/core/runpod/client.js';
import type { GpuType } from '../src/core/runpod/types.js';

function makeClient(): RunPodClient {
  return new RunPodClient({ apiKey: 'test-key' });
}

describe('estimateTrainingCost', () => {
  it('uses a default token rate for unknown model sizes', () => {
    const result = makeClient().estimateTrainingCost(1_000_000, 'unsloth/Custom-Model');
    expect(result.tokensPerSecond).toBe(2000);
    // totalTokens = 1e6 * 3 epochs = 3e6; seconds = 3e6/2000 = 1500; hours = 1500/3600 = 0.4167 -> rounds to 0.42
    expect(result.estimatedHours).toBe(0.42);
    // cost = 0.41666... * 0.16 = 0.0666 -> rounds to 0.07
    expect(result.estimatedCost).toBe(0.07);
  });

  it('uses a faster token rate for 1B models', () => {
    const result = makeClient().estimateTrainingCost(1_000_000, 'unsloth/Llama-3.2-1B');
    expect(result.tokensPerSecond).toBe(8000);
  });

  it('uses faster token rates for smaller models', () => {
    // Matching is by substring (e.g. includes('1B'), includes('3B')) so inputs must be unambiguous.
    expect(makeClient().estimateTrainingCost(1000, 'unsloth/Llama-3.2-1B').tokensPerSecond).toBe(8000);
    expect(makeClient().estimateTrainingCost(1000, 'unsloth/Llama-3.2-3B').tokensPerSecond).toBe(5000);
  });

  it('uses slower token rates for larger models', () => {
    expect(makeClient().estimateTrainingCost(1000, 'unsloth/Qwen-2.5-7B').tokensPerSecond).toBe(2500);
    expect(makeClient().estimateTrainingCost(1000, 'unsloth/Llama-3.1-8B').tokensPerSecond).toBe(2500);
    expect(makeClient().estimateTrainingCost(1000, 'unsloth/Llama-3.3-70B-Instruct').tokensPerSecond).toBe(400);
  });

  it('scales cost with epochs and GPU hourly rate', () => {
    const base = makeClient().estimateTrainingCost(3_600_000, 'x', 0.16, 3);
    const doubleEpochs = makeClient().estimateTrainingCost(3_600_000, 'x', 0.16, 6);
    // 3.6M tokens * 3 epochs / 2000 tps / 3600 = 1.5h; doubling epochs -> 3h.
    expect(base.estimatedHours).toBe(1.5);
    expect(doubleEpochs.estimatedHours).toBe(3);
    expect(doubleEpochs.estimatedCost).toBeCloseTo(base.estimatedCost * 2, 2);
  });

  it('increases estimated cost with a higher GPU hourly rate', () => {
    const cheap = makeClient().estimateTrainingCost(1_000_000, 'x', 0.16, 3);
    const expensive = makeClient().estimateTrainingCost(1_000_000, 'x', 0.32, 3);
    // Roughly double the hourly rate -> roughly double the cost (within rounding).
    expect(expensive.estimatedCost).toBeCloseTo(cheap.estimatedCost * 2, 1);
  });
});

describe('findBestAvailableGpu', () => {
  it('returns the smallest VRAM GPU that meets the minimum and is available', async () => {
    const client = makeClient();
    const gpus: GpuType[] = [
      { id: 'big', displayName: 'Big GPU', memoryInGb: 48, secureCloud: true, communityCloud: false },
      { id: 'small', displayName: 'Small GPU', memoryInGb: 24, secureCloud: true, communityCloud: false },
      { id: 'huge', displayName: 'Huge GPU', memoryInGb: 80, secureCloud: false, communityCloud: true },
    ];
    client.getGpuTypes = async () => gpus;

    const best = await client.findBestAvailableGpu(24);
    expect(best?.id).toBe('small');
  });

  it('filters out GPUs below the minimum VRAM', async () => {
    const client = makeClient();
    const gpus: GpuType[] = [
      { id: 'tiny', displayName: 'Tiny', memoryInGb: 8, secureCloud: true, communityCloud: true },
      { id: 'good', displayName: 'Good', memoryInGb: 24, secureCloud: true, communityCloud: true },
    ];
    client.getGpuTypes = async () => gpus;

    const best = await client.findBestAvailableGpu(24);
    expect(best?.id).toBe('good');
  });

  it('ignores GPUs that are not available on any cloud', async () => {
    const client = makeClient();
    const gpus: GpuType[] = [
      { id: 'offline', displayName: 'Offline', memoryInGb: 48, secureCloud: false, communityCloud: false },
      { id: 'offline2', displayName: 'Offline2', memoryInGb: 48, secureCloud: false, communityCloud: false },
    ];
    client.getGpuTypes = async () => gpus;

    const best = await client.findBestAvailableGpu(24);
    expect(best).toBeNull();
  });

  it('returns null when there are no GPUs at all', async () => {
    const client = makeClient();
    client.getGpuTypes = async () => [];
    expect(await client.findBestAvailableGpu(24)).toBeNull();
  });
});

describe('checkGpuAvailability', () => {
  it('reports availability based on cloud presence', async () => {
    const client = makeClient();
    const gpus: GpuType[] = [
      { id: 'sec', displayName: 'Secure', memoryInGb: 48, secureCloud: true, communityCloud: false },
      { id: 'comm', displayName: 'Community', memoryInGb: 24, secureCloud: false, communityCloud: true },
    ];
    client.getGpuTypes = async () => gpus;

    const sec = await client.checkGpuAvailability('sec');
    expect(sec.available).toBe(true);
    expect(sec.secureCloud).toBe(true);

    const comm = await client.checkGpuAvailability('comm');
    expect(comm.available).toBe(true);
    expect(comm.communityCloud).toBe(true);
  });

  it('reports unavailable for unknown GPU id', async () => {
    const client = makeClient();
    client.getGpuTypes = async () => [];
    const result = await client.checkGpuAvailability('does-not-exist');
    expect(result.available).toBe(false);
  });
});
