#!/usr/bin/env node
/**
 * Unsloth MCP Plugin - Environment Setup Script
 * 
 * This script is executed automatically after `npm install` (via "postinstall").
 * It creates a Python virtual environment and installs all required Python
 * packages for Unsloth toolchain execution.
 * 
 * Usage (manual): node scripts/setup.cjs [--recreate] [--python <path>]
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const VENV_DIR = path.join(__dirname, '..', '.venv');
const VENV_PYTHON = process.platform === 'win32'
  ? path.join(VENV_DIR, 'Scripts', 'python.exe')
  : path.join(VENV_DIR, 'bin', 'python');

// Python packages required by Unsloth toolchain
const PYTHON_PACKAGES = [
  // Core Unsloth
  'unsloth',
  'torch',
  'transformers',
  'datasets',
  'trl',
  'accelerate',
  'bitsandbytes',
  
  // Tokenizers
  'tokenizers',
  'sentencepiece',
  
  // Knowledge base / OCR
  'pytesseract',
  'easyocr',
  'Pillow',
  
  // Claude Vision API (optional, only if ANTHROPIC_API_KEY set)
  'anthropic',
  
  // Hugging Face Hub
  'huggingface_hub',
  
  // GGUF / model export
  'ctranslate2',
];

// ============================================================================
// Helpers
// ============================================================================

function log(message) {
  console.log(`[setup] ${message}`);
}

function error(message) {
  console.error(`[setup][ERROR] ${message}`);
}

function exec(command, options = {}) {
  log(`Executing: ${command}`);
  return execSync(command, {
    stdio: 'inherit',
    ...options
  });
}

// Detect the best Python executable to use
function detectPython() {
  const candidates = [];
  
  // Check for PYTHON_PATH env var first
  if (process.env.PYTHON_PATH) {
    candidates.push(process.env.PYTHON_PATH);
  }
  
  // Common Python executables
  candidates.push('python3', 'python');
  
  for (const candidate of candidates) {
    try {
      const version = execSync(`${candidate} --version`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      log(`Using Python executable: ${candidate} (${version})`);
      return candidate;
    } catch (err) {
      continue;
    }
  }
  
  throw new Error('No suitable Python executable found. Please install Python 3.10-3.12 and ensure it is on PATH.');
}

// ============================================================================
// Setup Logic
// ============================================================================

function createVenv(pythonExecutable) {
  if (fs.existsSync(VENV_PYTHON)) {
    log('Virtual environment already exists.');
    return false;
  }
  
  log(`Creating virtual environment in ${VENV_DIR}`);
  
  try {
    exec(`${pythonExecutable} -m venv "${VENV_DIR}"`);
    log('Virtual environment created successfully.');
    return true;
  } catch (err) {
    // Try with --ensure-pip flag for systems without it
    log('Retrying venv creation with --ensure-pip...');
    try {
      exec(`${pythonExecutable} -m venv --ensure-pip "${VENV_DIR}"`);
      log('Virtual environment created successfully.');
      return true;
    } catch (err2) {
      throw new Error(`Failed to create virtual environment: ${err2.message}`);
    }
  }
}

function updatePip() {
  log('Updating pip...');
  exec(`${VENV_PYTHON} -m pip install --upgrade pip`);
}

function installPackages() {
  log('Installing Python packages...');
  log(`Total packages: ${PYTHON_PACKAGES.length}`);
  
  // Install packages one by one to provide better feedback and retry handling
  for (const pkg of PYTHON_PACKAGES) {
    try {
      log(`Installing ${pkg}...`);
      exec(`${VENV_PYTHON} -m pip install "${pkg}"`);
      log(`✓ ${pkg} installed`);
    } catch (err) {
      error(`Failed to install ${pkg}: ${err.message}`);
      throw err;
    }
  }
}

function verifyInstallation() {
  log('Verifying installation...');
  
  const checks = [
    { name: 'unsloth', test: 'import unsloth' },
    { name: 'torch', test: 'import torch' },
    { name: 'transformers', test: 'import transformers' },
    { name: 'datasets', test: 'import datasets' },
    { name: 'trl', test: 'import trl' },
  ];
  
  for (const check of checks) {
    try {
      exec(`${VENV_PYTHON} -c "${check.test}"`);
      log(`✓ ${check.name} verified`);
    } catch (err) {
      error(`Verification failed for ${check.name}: ${err.message}`);
      throw err;
    }
  }
  
  // Check CUDA availability if torch is available
  try {
    const cudaAvailable = execSync(
      `${VENV_PYTHON} -c "import torch; print(torch.cuda.is_available())"`,
      { stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString().trim();
    log(`CUDA available: ${cudaAvailable}`);
  } catch (err) {
    log('Could not verify CUDA availability (this is optional for some operations)');
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const recreate = args.includes('--recreate');
  let pythonExecutable;
  
  // Parse --python flag
  const pythonIdx = args.indexOf('--python');
  if (pythonIdx >= 0 && args[pythonIdx + 1]) {
    pythonExecutable = args[pythonIdx + 1];
    log(`Using specified Python: ${pythonExecutable}`);
  }
  
  log('==============================================');
  log(' Unsloth MCP Plugin - Environment Setup');
  log(' ==============================================');
  
  // Detect Python
  try {
    pythonExecutable = pythonExecutable || detectPython();
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
  
  // Create venv if needed
  try {
    const created = createVenv(pythonExecutable);
    if (!created && !recreate) {
      log('Skipping venv creation (already exists). Use --recreate to force.');
    } else {
      if (recreate && fs.existsSync(VENV_DIR)) {
        log('Removing existing virtual environment...');
        fs.rmSync(VENV_DIR, { recursive: true, force: true });
      }
      createVenv(pythonExecutable);
    }
    
    // Update pip
    updatePip();
    
    // Install packages
    installPackages();
    
    // Verify installation
    verifyInstallation();
    
    log('==============================================');
    log(' Setup complete!');
    log(` Virtual environment: ${VENV_DIR}`);
    log(' Unsloth toolchain is ready to use.');
    log(' ==============================================');
    
  } catch (err) {
    error(`Setup failed: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  error(`Unexpected error: ${err.stack || err.message}`);
  process.exit(1);
});
