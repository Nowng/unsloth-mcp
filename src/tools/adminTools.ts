/**
 * Cost Tracking & Checkpoint Management Tools
 * 
 * Defines tools for GPU cost tracking and training checkpoint management.
 */

import { tool, Tool } from '@lmstudio/sdk';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// ============================================================================
// Cost Tracking State (JSON-based)
// ============================================================================

interface CostSession {
  id: string;
  job_id?: string;
  model: string;
  gpu_type: string;
  cost_per_hour: number;
  start_time: string;
  duration_seconds: number;
  cost: number;
}

interface CostState {
  sessions: CostSession[];
  daily: Record<string, number>;
  weekly: Record<string, number>;
  monthly: Record<string, number>;
  budget: number;
}

const COST_DATA_DIR = path.join(process.cwd(), 'data', 'cost');
const COST_DATA_FILE = path.join(COST_DATA_DIR, 'cost-tracker.json');

function loadCostState(): CostState {
  try {
    if (fs.existsSync(COST_DATA_FILE)) {
      return JSON.parse(fs.readFileSync(COST_DATA_FILE, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return { sessions: [], daily: {}, weekly: {}, monthly: {}, budget: 100 };
}

function _saveCostState(state: CostState): void {
  fs.mkdirSync(COST_DATA_DIR, { recursive: true });
  fs.writeFileSync(COST_DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

// ============================================================================
// Checkpoint Management State (JSON-based)
// ============================================================================

interface Checkpoint {
  id: string;
  training_job_id: string;
  version: number;
  created_at: string;
  size_mb: number;
  path: string;
  resume_command?: string;
}

const CHECKPOINT_DATA_DIR = path.join(process.cwd(), 'data', 'checkpoints');
const CHECKPOINT_DATA_FILE = path.join(CHECKPOINT_DATA_DIR, 'checkpoints.json');

function loadCheckpoints(): Checkpoint[] {
  try {
    if (fs.existsSync(CHECKPOINT_DATA_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_DATA_FILE, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return [];
}

function saveCheckpoints(checkpoints: Checkpoint[]): void {
  fs.mkdirSync(CHECKPOINT_DATA_DIR, { recursive: true });
  fs.writeFileSync(CHECKPOINT_DATA_FILE, JSON.stringify(checkpoints, null, 2), 'utf-8');
}

// ============================================================================
// Tool Factory
// ============================================================================

export function createAdminTools(): Tool[] {

  // ============================================================================
  // cost_dashboard
  // ============================================================================

  const costDashboardTool = tool({
    name: 'cost_dashboard',
    description: 'Get GPU cost tracking dashboard with current sessions, daily/weekly/monthly spending, and budget alerts.',
    parameters: {},
    implementation: async (_params, { status, warn: _warn }) => {
      try {
        status('Loading cost tracking dashboard');
        const state = loadCostState();

        const today = new Date().toISOString().slice(0, 10);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const todayCost = state.sessions
          .filter(s => s.start_time.slice(0, 10) === today)
          .reduce((sum, s) => sum + s.cost, 0);

        const weekCost = state.sessions
          .filter(s => s.start_time.slice(0, 10) >= weekAgo)
          .reduce((sum, s) => sum + s.cost, 0);

        const monthCost = state.sessions
          .filter(s => s.start_time.slice(0, 10) >= monthAgo)
          .reduce((sum, s) => sum + s.cost, 0);

        const activeAlerts: string[] = [];
        if (monthCost > state.budget * 0.8) {
          activeAlerts.push(`Warning: Monthly spending ($${monthCost.toFixed(2)}) approaching budget ($${state.budget})`);
        }
        if (todayCost > state.budget * 0.3) {
          activeAlerts.push(`Warning: Today's spending ($${todayCost.toFixed(2)}) is high relative to budget`);
        }

        return JSON.stringify({
          success: true,
          current_sessions: state.sessions.length,
          today_cost: Math.round(todayCost * 100) / 100,
          week_cost: Math.round(weekCost * 100) / 100,
          month_cost: Math.round(monthCost * 100) / 100,
          budget: state.budget,
          budget_status: monthCost > state.budget ? 'over' : monthCost > state.budget * 0.8 ? 'warning' : 'ok',
          active_alerts: activeAlerts,
          summary: `Today: $${todayCost.toFixed(2)} | Week: $${weekCost.toFixed(2)} | Month: $${monthCost.toFixed(2)}`,
        }, null, 2);
      } catch (error) {
        return `Error getting cost dashboard: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // ============================================================================
  // checkpoint_resume
  // ============================================================================

  const checkpointResumeTool = tool({
    name: 'checkpoint_resume',
    description: 'List and resume from training checkpoints. Shows all saved checkpoints with job IDs, steps, and timestamps.',
    parameters: {
      job_id: z.string().optional().describe('Optional: Filter checkpoints by job ID'),
      action: z.enum(['list', 'get_latest', 'save']).optional().describe('Action to perform'),
    },
    implementation: async ({ job_id, action = 'list' }, { status }) => {
      try {
        status(`Listing checkpoints (${action})`);
        let checkpoints = loadCheckpoints();

        if (job_id) {
          checkpoints = checkpoints.filter(cp => cp.training_job_id === job_id);
        }

        if (action === 'get_latest') {
          const latest = checkpoints.length > 0
            ? checkpoints[checkpoints.length - 1]
            : null;

          if (!latest) {
            return JSON.stringify({ success: false, message: `No checkpoints found for job: ${job_id}` }, null, 2);
          }

          return JSON.stringify({
            success: true,
            checkpoint: latest,
            resumeCommand: latest.resume_command || `Resume training from checkpoint ${latest.id}`,
          }, null, 2);
        }

        // Also handle 'save' action if job_id provided with additional context
        if (action === 'save') {
          const newCheckpoint: Checkpoint = {
            id: randomUUID(),
            training_job_id: job_id || `job-${Date.now()}`,
            version: checkpoints.filter(cp => cp.training_job_id === job_id).length + 1,
            created_at: new Date().toISOString(),
            size_mb: 0,
            path: '',
            resume_command: `python train.py --resume ${checkpointDataDir()} --job ${job_id}`,
          };
          checkpoints.push(newCheckpoint);
          saveCheckpoints(checkpoints);
          return JSON.stringify({ success: true, checkpoint: newCheckpoint }, null, 2);
        }

        // Default: list all
        const totalSizeMb = checkpoints.reduce((sum, cp) => sum + cp.size_mb, 0);

        return JSON.stringify({
          success: true,
          checkpoints: checkpoints.map(cp => ({
            id: cp.id,
            jobId: cp.training_job_id,
            version: cp.version,
            createdAt: cp.created_at,
            sizeMb: cp.size_mb,
          })),
          stats: {
            totalCheckpoints: checkpoints.length,
            totalSizeMb,
            oldestCheckpoint: checkpoints.length > 0 ? checkpoints[0].created_at : null,
            newestCheckpoint: checkpoints.length > 0 ? checkpoints[checkpoints.length - 1].created_at : null,
          },
          summary: `Found ${checkpoints.length} checkpoint(s)${job_id ? ` for job ${job_id}` : ''}`,
        }, null, 2);
      } catch (error) {
        return `Error with checkpoints: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  return [costDashboardTool, checkpointResumeTool];
}

function checkpointDataDir(): string {
  return CHECKPOINT_DATA_DIR;
}
