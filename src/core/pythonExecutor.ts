/**
 * Python Executor
 *
 * Executes Python scripts within the plugin's virtual environment (venv).
 * This replaces the original inline Python script execution via child_process.
 * All Unsloth toolchain operations route through this executor.
 */

import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Candidate starting points for locating the project root. These resolve to
 * the current module directory in real Node ESM runtime (V8 stack API), the
 * CommonJS / jest `__dirname` global when present, and the working directory
 * as a universal fallback. None of these reliably distinguish production from
 * tests, so we never trust a single one — we walk up to the project root and
 * then locate the bundled Python scripts explicitly.
 */
function candidateDirs(): string[] {
  const candidates: string[] = [];

  // Candidate 1: V8 stack resolution (real Node ESM → dist/core).
  const originalPrepareStackTrace = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = (_err, stack) => stack;
    let capture: unknown;
    (() => {
      capture = new Error();
    })();
    const frames = capture as unknown as {
      stack: { getFrame(index: number): { getFileName(): string } };
    };
    const file = frames.stack.getFrame(0).getFileName();
    if (file) {
      candidates.push(file.startsWith('file:') ? fileURLToPath(file) : file);
    }
  } catch {
    // V8 stack API unavailable (e.g. some sandboxed runtimes); ignore.
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }

  // Candidate 2: CommonJS / jest global __dirname (tests → src/core).
  const g = globalThis as { __dirname?: string };
  if (typeof g.__dirname !== 'undefined') {
    candidates.push(g.__dirname);
  }

  // Candidate 3: current working directory.
  candidates.push(process.cwd());

  return candidates;
}

/**
 * Walk up from `start` to the nearest project root — the first ancestor that
 * contains package.json or a .venv directory.
 */
function toProjectRoot(start: string): string {
  let d = start;
  while (true) {
    if (
      fs.existsSync(path.join(d, 'package.json')) ||
      fs.existsSync(path.join(d, '.venv'))
    ) {
      return d;
    }
    const parent = path.dirname(d);
    if (parent === d) break;
    d = parent;
  }
  return start;
}

/**
 * Resolve the directory that holds the bundled Python scripts. Production
 * copies them next to dist (`dist/core/scripts`); tests keep them in
 * `src/core/scripts`. We prefer `dist` if present, otherwise fall back to
 * `src`, searching from every candidate's project root.
 */
function resolveScriptsDir(): string {
  const roots = new Set(candidateDirs().map(toProjectRoot));

  for (const r of roots) {
    const distScripts = path.join(r, 'dist', 'core', 'scripts');
    if (fs.existsSync(path.join(distScripts, 'check_installation.py'))) {
      return distScripts;
    }
  }
  for (const r of roots) {
    const srcScripts = path.join(r, 'src', 'core', 'scripts');
    if (fs.existsSync(path.join(srcScripts, 'check_installation.py'))) {
      return srcScripts;
    }
  }

  // Last resort: a sibling `scripts` folder next to any candidate.
  for (const c of candidateDirs()) {
    const s = path.join(c, 'scripts');
    if (fs.existsSync(path.join(s, 'check_installation.py'))) {
      return s;
    }
  }

  return path.join(process.cwd(), 'src', 'core', 'scripts');
}

/**
 * Resolve the plugin project root that contains the `.venv`. Falls back to the
 * working directory when no venv can be located.
 */
function resolveVenvRoot(): string {
  const roots = candidateDirs().map(toProjectRoot);
  for (const r of roots) {
    if (fs.existsSync(path.join(r, '.venv'))) return r;
  }
  return roots[0] || process.cwd();
}

/** Directory containing the bundled Python scripts. */
export const scriptsDir = resolveScriptsDir();

/** Project root that contains the plugin's `.venv`. */
export const venvRoot = resolveVenvRoot();

export interface PythonExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface PythonExecutionOptions {
  /** Timeout in milliseconds (default: 300000 = 5 minutes) */
  timeout?: number;
  /** Maximum output size in bytes (default: 10MB) */
  maxSize?: number;
  /** Environment variables to pass through */
  env?: Record<string, string>;
  /** AbortSignal used to cancel the running process. */
  signal?: AbortSignal;
}

/**
 * Error thrown when a Python execution is aborted via its AbortSignal.
 * Tool implementations detect this to return a graceful "aborted" message
 * instead of a generic failure.
 */
export class ExecutionAbortedError extends Error {
  constructor(message = 'Execution was aborted by the user.') {
    super(message);
    this.name = 'ExecutionAbortedError';
  }
}

/**
 * Determine whether an arbitrary thrown value represents an abort.
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof ExecutionAbortedError) return true;
  if (error && typeof error === 'object' && 'name' in error) {
    return (error as { name?: string }).name === 'AbortError';
  }
  return false;
}

// ============================================================================
// Venv Detection
// ============================================================================

/**
 * Get the path to the Python executable in the plugin's venv.
 * Falls back to system Python if venv is not available.
 */
export function getVenvPythonPath(): string {
  if (process.platform === 'win32') {
    return path.join(venvRoot, '.venv', 'Scripts', 'python.exe');
  }
  return path.join(venvRoot, '.venv', 'bin', 'python');
}

/**
 * Check if the venv Python executable exists.
 */
export function isVenvAvailable(): boolean {
  const pythonPath = getVenvPythonPath();
  return fs.existsSync(pythonPath);
}

/**
 * Get the Python executable to use (venv or system fallback).
 */
export function getPythonExecutable(): string {
  if (isVenvAvailable()) {
    return getVenvPythonPath();
  }

  // Fallback to system Python
  if (process.env.PYTHON_PATH) {
    return process.env.PYTHON_PATH;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

// ============================================================================
// Script Execution
// ============================================================================

/**
 * Execute a Python script file within the venv.
 * The script should output JSON to stdout for structured results.
 */
export async function executeScript(
  scriptPath: string,
  args: string[] = [],
  options: PythonExecutionOptions = {}
): Promise<PythonExecutionResult> {
  const {
    timeout = 300000,
    maxSize = 10 * 1024 * 1024,
    env = {},
    signal,
  } = options;

  const pythonExecutable = getPythonExecutable();

  // Resolve script path relative to the scripts directory
  const resolvedScript = path.isAbsolute(scriptPath)
    ? scriptPath
    : path.join(scriptsDir, scriptPath);

  if (!fs.existsSync(resolvedScript)) {
    throw new Error(`Python script not found: ${resolvedScript}`);
  }

  const fullArgs = [resolvedScript, ...args];

  try {
    const { stdout, stderr } = await execFileAsync(pythonExecutable, fullArgs, {
      timeout,
      maxBuffer: maxSize,
      env: { ...process.env, ...env },
      signal,
    });

    return {
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      exitCode: 0,
    };
  } catch (error: unknown) {
    // Handle cancellation / abort
    if (signal?.aborted || isAbortError(error)) {
      throw new ExecutionAbortedError();
    }

    // Handle timeout
    if (
      typeof error === 'object' &&
      error !== null &&
      ('code' in error || 'killed' in error)
    ) {
      const err = error as { code?: string; killed?: boolean };
      if (err.code === 'ETIMEDOUT' || err.killed) {
        throw new Error(`Python script timed out after ${timeout}ms`);
      }
    }

    // Handle buffer size exceeded
    if (
      typeof error === 'object' &&
      error !== null &&
      ('bufferSize' in error || ('stderr' in error && String((error as { stderr: unknown }).stderr).includes('BufferOverflow')))
    ) {
      throw new Error(`Python output exceeded maximum size of ${maxSize} bytes`);
    }

    // Command failed (non-zero exit)
    const err = error as { stderr?: unknown; stdout?: unknown; message?: string };
    const stderrOutput = (err.stderr?.toString() ?? '') || err.message || 'Unknown error';

    return {
      stdout: (err.stdout?.toString() ?? '') || '',
      stderr: stderrOutput,
      exitCode: 1,
    };
  }
}

/**
 * Execute a Python one-liner command.
 */
export async function executeCommand(
  code: string,
  options: PythonExecutionOptions = {}
): Promise<PythonExecutionResult> {
  return executeScript('-c', [code], options);
}

/**
 * Parse JSON output from a Python script execution.
 * Returns the parsed data or throws on parse error.
 *
 * Some toolchains (notably Unsloth, which prints patching banners to stdout)
 * emit logs alongside the JSON payload. Parsing first tries the fast, strict
 * path and then falls back to locating the first balanced JSON object so that
 * leading/trailing banner text does not break structured parsing.
 */
export function parseJsonResult(result: PythonExecutionResult): unknown {
  const raw = result.stdout;

  if (!raw || !raw.trim()) {
    return {};
  }

  // Fast path: clean, self-contained JSON.
  try {
    return JSON.parse(raw);
  } catch {
    // Fall through to tolerant parsing below.
  }

  // Tolerant path: locate the first balanced JSON object and parse just that,
  // ignoring any preceding banners or trailing log lines.
  const start = raw.indexOf('{');
  if (start !== -1) {
    let depth = 0;
    let started = false;
    let json = '';
    for (let i = start; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '{') {
        depth += 1;
        started = true;
        json += ch;
      } else if (ch === '}') {
        depth -= 1;
        json += ch;
        if (started && depth === 0) {
          break;
        }
      } else if (started) {
        json += ch;
      }
    }
    if (started && depth === 0) {
      try {
        return JSON.parse(json);
      } catch {
        // Fall through to the throw below.
      }
    }
  }

  throw new Error(`Failed to parse Python output as JSON. Raw output:\n${raw}`);
}

/**
 * Execute a Python script and parse its JSON output.
 */
export async function executeScriptAndGetJson(
  scriptPath: string,
  args: string[] = [],
  options: PythonExecutionOptions = {}
): Promise<Record<string, unknown>> {
  const result = await executeScript(scriptPath, args, options);

  if (result.exitCode !== 0 && result.stdout.trim()) {
    // Try to parse error info from stdout
    try {
      const parsed = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
      if (parsed.error && typeof parsed.error === 'string') {
        throw new Error(parsed.error);
      }
    } catch {
      // Not JSON, throw raw error
    }
  }

  return parseJsonResult(result) as Record<string, unknown>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a Python package is installed in the venv.
 */
export async function isPackageInstalled(packageName: string, timeout = 10000): Promise<boolean> {
  try {
    await executeCommand(`import ${packageName.replace(/-/g, '_')}`, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the version of a Python package.
 */
export async function getPackageVersion(packageName: string): Promise<string | null> {
  try {
    const result = await executeCommand(
      `import ${packageName.replace(/-/g, '_')}; print(getattr(${packageName.replace(/-/g, '_')}, '__version__', 'unknown'))`,
      { timeout: 10000 }
    );
    return result.stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Install a Python package into the venv.
 */
export async function installPackage(packageName: string, signal?: AbortSignal): Promise<void> {
  const pipExecutable = process.platform === 'win32'
    ? path.join(venvRoot, '.venv', 'Scripts', 'pip.exe')
    : path.join(venvRoot, '.venv', 'bin', 'pip');

  await execFileAsync(pipExecutable, ['install', packageName], { signal });
}
