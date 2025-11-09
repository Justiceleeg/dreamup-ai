#!/usr/bin/env node

/**
 * Script to copy test-results directory to viewer/public for Vercel deployment
 * This allows static files to be served from the public directory
 */

const { cp, mkdir, access } = require('fs/promises');
const { constants } = require('fs');
const { join } = require('path');

async function copyTestResults() {
  const projectRoot = join(__dirname, '../..');
  const sourceDir = join(projectRoot, 'test-results');
  const destDir = join(projectRoot, 'viewer', 'public', 'test-results');

  try {
    // Check if source directory exists
    try {
      await access(sourceDir, constants.F_OK);
    } catch {
      console.warn('⚠ test-results directory not found, skipping copy');
      // Create empty directory so build doesn't fail
      await mkdir(destDir, { recursive: true });
      return;
    }

    // Create destination directory if it doesn't exist
    await mkdir(destDir, { recursive: true });

    // Copy test-results to public directory
    await cp(sourceDir, destDir, { recursive: true });

    console.log('✓ Test results copied to viewer/public/test-results');
  } catch (error) {
    console.error('✗ Failed to copy test results:', error);
    // Don't exit with error code - allow build to continue even if copy fails
    // The viewer will just show "no test results" message
  }
}

copyTestResults();

