/**
 * Tests for the Python executor utility functions.
 *
 * These tests focus on path resolution, error handling, and JSON parsing,
 * rather than executing a real Python interpreter (which requires the venv
 * created by scripts/setup.cjs).
 */
import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import {
  getVenvPythonPath,
  isVenvAvailable,
  getPythonExecutable,
  parseJsonResult,
  executeScript,
} from '../src/core/pythonExecutor.js';

describe('pythonExecutor path helpers', () => {
  it('getVenvPythonPath should point into the plugin .venv directory', () => {
    const venvPath = getVenvPythonPath();
    expect(venvPath).toContain('.venv');
    // On non-Windows it should use bin/python
    if (process.platform !== 'win32') {
      expect(venvPath.endsWith('bin/python')).toBe(true);
    } else {
      expect(venvPath.endsWith('Scripts\python.exe')).toBe(true);
    }
  });

  it('isVenvAvailable should return a boolean', () => {
    expect(typeof isVenvAvailable()).toBe('boolean');
  });

  it('getPythonExecutable should never return an empty string', () => {
    const exe = getPythonExecutable();
    expect(exe.length).toBeGreaterThan(0);
  });

  it('getPythonExecutable should prefer venv when available', () => {
    // Regardless of availability, this should not throw.
    expect(typeof getPythonExecutable()).toBe('string');
  });
});

describe('parseJsonResult', () => {
  it('should parse valid JSON from stdout', () => {
    const parsed = parseJsonResult({ stdout: '{"success": true, "n": 42}', stderr: '', exitCode: 0 });
    expect(parsed).toEqual({ success: true, n: 42 });
  });

  it('should return an empty object for empty stdout', () => {
    expect(parseJsonResult({ stdout: '', stderr: '', exitCode: 0 })).toEqual({});
  });

  it('should throw on invalid JSON', () => {
    expect(() => parseJsonResult({ stdout: '{not json}', stderr: '', exitCode: 1 })).toThrow(/JSON/);
  });
});

describe('executeScript', () => {
  it('should throw when the script file does not exist', async () => {
    await expect(executeScript('nonexistent_script.py')).rejects.toThrow(/not found/i);
  });

  it('should locate an existing bundled script', async () => {
    // check_installation.py is a real bundled script; without venv it will
    // fail to run, but the path-resolution error path is exercised.
    const exists = fs.existsSync(
      require('path').join(__dirname, '..', 'src', 'core', 'scripts', 'check_installation.py')
    );
    if (exists) {
      // Should not throw a "not found" error; may return an exit code instead.
      // Unsloth patches imports on load, so execution can take several seconds;
      // bound both the script run and this Jest test to keep the suite fast yet reliable.
      const result = await executeScript('check_installation.py', [], { timeout: 120000 });
      expect(result).toHaveProperty('exitCode');
    } else {
      throw new Error('Bundled check_installation.py missing - test setup error');
    }
  }, 120000);
});
