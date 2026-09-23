#!/usr/bin/env node
/**
 * Copy bundled Python scripts (and other assets) from src/ into dist/ so the
 * compiled plugin is self-contained. tsc does NOT copy non-TypeScript files,
 * so we mirror every *.py file under src/** to dist/** preserving structure.
 *
 * Usage: node scripts/copy-scripts.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

/** Recursively copy a directory tree, preserving .py files. */
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else if (entry.isFile() && /\.py$/.test(entry.name)) {
      fs.copyFileSync(src, dest);
    }
  }
}

/** Count all *.py files under a directory tree. */
function countPyFiles(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) n += countPyFiles(p);
    else if (e.isFile() && /\.py$/.test(e.name)) n += 1;
  }
  return n;
}

if (!fs.existsSync(srcDir)) {
  console.log('[copy-scripts] src/ not found; skipping.');
  process.exit(0);
}

copyDir(srcDir, distDir);
console.log(`[copy-scripts] Copied ${countPyFiles(srcDir)} Python script(s) from src/ to dist/.`);
