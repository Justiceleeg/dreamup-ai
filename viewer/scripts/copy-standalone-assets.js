#!/usr/bin/env node

/**
 * Post-build script for Next.js standalone mode
 * Copies public and static assets to the standalone directory
 */

const { cp } = require('fs/promises');
const { join } = require('path');

async function copyStandaloneAssets() {
  const currentDir = process.cwd();
  
  try {
    // Copy public directory
    const publicSrc = join(currentDir, 'public');
    const publicDest = join(currentDir, '.next/standalone/viewer/public');
    await cp(publicSrc, publicDest, { recursive: true, force: true });
    console.log('✓ Copied public assets to standalone');

    // Copy static directory
    const staticSrc = join(currentDir, '.next/static');
    const staticDest = join(currentDir, '.next/standalone/viewer/.next/static');
    await cp(staticSrc, staticDest, { recursive: true, force: true });
    console.log('✓ Copied static assets to standalone');
  } catch (error) {
    console.error('✗ Failed to copy standalone assets:', error);
    process.exit(1);
  }
}

copyStandaloneAssets();

