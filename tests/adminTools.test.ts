/**
 * Tests for cost tracking and checkpoint management tool logic.
 *
 * The state persistence functions read/write JSON files under process.cwd(),
 * so we chdir into a temp dir before dynamically importing the module to keep
 * tests isolated from the real filesystem.
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

let tmpDir: string;
let cwdBefore: string;
// Populated in beforeAll via dynamic import.
let adminModule: { createAdminTools: () => any[] };

async function invokeTool(tools: any[], name: string, args: Record<string, unknown> = {}) {
  const tool = tools.find(t => t.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return JSON.parse(await tool.implementation(args, { status: () => {}, warn: () => {}, signal: null as any }));
}

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unsloth-admin-test-'));
  cwdBefore = process.cwd();
  process.chdir(tmpDir);
  // Dynamic import so COST_DATA_DIR / CHECKPOINT_DATA_DIR capture the temp cwd.
  adminModule = require('../src/tools/adminTools.js');
});

afterAll(() => {
  process.chdir(cwdBefore);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('cost_dashboard tool', () => {
  it('returns an empty dashboard by default', async () => {
    const tools = adminModule.createAdminTools();
    const result = await invokeTool(tools, 'cost_dashboard');
    expect(result.success).toBe(true);
    expect(result.current_sessions).toBe(0);
    expect(result.today_cost).toBe(0);
    expect(result.budget_status).toBe('ok');
  });

  it('aggregates spending by day/week/month and computes budget status', async () => {
    // Write a cost state file directly.
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const oldDay = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const state = {
      sessions: [
        { id: 's1', model: 'm', gpu_type: 'gpu', cost_per_hour: 1, start_time: today, duration_seconds: 10, cost: 30 },
        { id: 's2', model: 'm', gpu_type: 'gpu', cost_per_hour: 1, start_time: weekAgo, duration_seconds: 10, cost: 20 },
        { id: 's3', model: 'm', gpu_type: 'gpu', cost_per_hour: 1, start_time: monthAgo, duration_seconds: 10, cost: 40 },
        { id: 's4', model: 'm', gpu_type: 'gpu', cost_per_hour: 1, start_time: oldDay, duration_seconds: 10, cost: 100 }, // outside all windows
      ],
      daily: {}, weekly: {}, monthly: {}, budget: 100,
    };

    const dir = path.join(tmpDir, 'data', 'cost');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'cost-tracker.json'), JSON.stringify(state));

    const result = await invokeTool(adminModule.createAdminTools(), 'cost_dashboard');
    expect(result.today_cost).toBe(30);
    expect(result.week_cost).toBe(50);   // today(30) + weekAgo(20)
    expect(result.month_cost).toBe(90);  // + monthAgo(40)
    expect(result.budget_status).toBe('warning'); // 90 > 80 (80% of 100) -> warning
  });

  it('emits a budget warning when monthly spending exceeds 80% of budget', async () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const state = {
      sessions: [
        { id: 's1', model: 'm', gpu_type: 'gpu', cost_per_hour: 1, start_time: today, duration_seconds: 10, cost: 90 },
      ],
      daily: {}, weekly: {}, monthly: {}, budget: 100,
    };
    const dir = path.join(tmpDir, 'data', 'cost');
    fs.writeFileSync(path.join(dir, 'cost-tracker.json'), JSON.stringify(state));

    const result = await invokeTool(adminModule.createAdminTools(), 'cost_dashboard');
    expect(result.budget_status).toBe('warning');
    expect(result.active_alerts.length).toBeGreaterThan(0);
  });

  it('reports "over" budget status when monthly spending exceeds budget', async () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const state = {
      sessions: [
        { id: 's1', model: 'm', gpu_type: 'gpu', cost_per_hour: 1, start_time: today, duration_seconds: 10, cost: 150 },
      ],
      daily: {}, weekly: {}, monthly: {}, budget: 100,
    };
    const dir = path.join(tmpDir, 'data', 'cost');
    fs.writeFileSync(path.join(dir, 'cost-tracker.json'), JSON.stringify(state));

    const result = await invokeTool(adminModule.createAdminTools(), 'cost_dashboard');
    expect(result.budget_status).toBe('over');
  });
});

describe('checkpoint_resume tool', () => {
  it('lists checkpoints with aggregate stats', async () => {
    const dir = path.join(tmpDir, 'data', 'checkpoints');
    fs.mkdirSync(dir, { recursive: true });
    const now = new Date().toISOString();
    const state = [
      { id: 'cp1', training_job_id: 'jobA', version: 1, created_at: now, size_mb: 500, path: '/x' },
      { id: 'cp2', training_job_id: 'jobA', version: 2, created_at: now, size_mb: 700, path: '/y' },
      { id: 'cp3', training_job_id: 'jobB', version: 1, created_at: now, size_mb: 300, path: '/z' },
    ];
    fs.writeFileSync(path.join(dir, 'checkpoints.json'), JSON.stringify(state));

    const result = await invokeTool(adminModule.createAdminTools(), 'checkpoint_resume', { action: 'list' });
    expect(result.success).toBe(true);
    expect(result.checkpoints).toHaveLength(3);
    expect(result.stats.totalCheckpoints).toBe(3);
    expect(result.stats.totalSizeMb).toBe(1500);
    expect(result.stats.oldestCheckpoint).toBeTruthy();
    expect(result.stats.newestCheckpoint).toBeTruthy();
  });

  it('filters checkpoints by job_id', async () => {
    const dir = path.join(tmpDir, 'data', 'checkpoints');
    fs.mkdirSync(dir, { recursive: true });
    const now = new Date().toISOString();
    const state = [
      { id: 'cp1', training_job_id: 'jobA', version: 1, created_at: now, size_mb: 100, path: '/x' },
      { id: 'cp2', training_job_id: 'jobB', version: 1, created_at: now, size_mb: 100, path: '/y' },
    ];
    fs.writeFileSync(path.join(dir, 'checkpoints.json'), JSON.stringify(state));

    const result = await invokeTool(adminModule.createAdminTools(), 'checkpoint_resume', { job_id: 'jobA', action: 'list' });
    expect(result.checkpoints).toHaveLength(1);
    expect(result.checkpoints[0].jobId).toBe('jobA');
  });

  it('get_latest returns the most recent checkpoint for a job', async () => {
    const dir = path.join(tmpDir, 'data', 'checkpoints');
    fs.mkdirSync(dir, { recursive: true });
    const t1 = '2024-01-01T00:00:00.000Z';
    const t2 = '2024-01-02T00:00:00.000Z';
    const state = [
      { id: 'cp1', training_job_id: 'jobA', version: 1, created_at: t1, size_mb: 100, path: '/x' },
      { id: 'cp2', training_job_id: 'jobA', version: 2, created_at: t2, size_mb: 200, path: '/y' },
    ];
    fs.writeFileSync(path.join(dir, 'checkpoints.json'), JSON.stringify(state));

    const result = await invokeTool(adminModule.createAdminTools(), 'checkpoint_resume', { job_id: 'jobA', action: 'get_latest' });
    expect(result.success).toBe(true);
    expect(result.checkpoint.id).toBe('cp2');
    expect(result.resumeCommand).toContain('cp2');
  });

  it('reports no checkpoints found for unknown job', async () => {
    const result = await invokeTool(adminModule.createAdminTools(), 'checkpoint_resume', { job_id: 'ghost', action: 'get_latest' });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/no checkpoints/i);
  });

  it('save creates and persists a new checkpoint, incrementing version', async () => {
    const dir = path.join(tmpDir, 'data', 'checkpoints');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'checkpoints.json'), JSON.stringify([]));

    const result = await invokeTool(adminModule.createAdminTools(), 'checkpoint_resume', { job_id: 'jobX', action: 'save' });
    expect(result.success).toBe(true);
    expect(result.checkpoint.version).toBe(1);
    expect(result.checkpoint.resume_command).toContain('resume');

    // Saving again should bump the version.
    const result2 = await invokeTool(adminModule.createAdminTools(), 'checkpoint_resume', { job_id: 'jobX', action: 'save' });
    expect(result2.checkpoint.version).toBe(2);
  });
});
