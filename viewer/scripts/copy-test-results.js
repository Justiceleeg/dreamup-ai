#!/usr/bin/env node

/**
 * Pre-build script that:
 * 1. Copies test-results directory to viewer/public for static file serving
 * 2. Copies src directory to viewer/src so API routes can import from it
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
    }

    // Create destination directory if it doesn't exist
    await mkdir(destDir, { recursive: true });

    // Copy test-results to public directory
    await cp(sourceDir, destDir, { recursive: true });

    console.log('✓ Test results copied to viewer/public/test-results');
  } catch (error) {
    console.error('✗ Failed to copy test results:', error);
    // Don't exit with error code - allow build to continue even if copy fails
  }
}

async function copySrcDirectory() {
  const projectRoot = join(__dirname, '../..');
  const sourceDir = join(projectRoot, 'src');
  const destDir = join(projectRoot, 'viewer', 'src');

  try {
    // Check if source directory exists
    try {
      await access(sourceDir, constants.F_OK);
    } catch {
      console.warn('⚠ src directory not found, skipping copy');
      return;
    }

    // Remove existing src directory if it exists
    try {
      await access(destDir, constants.F_OK);
      const { rm } = require('fs/promises');
      await rm(destDir, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, that's fine
    }

    // Create destination directory
    await mkdir(destDir, { recursive: true });

    // Copy src to viewer/src
    await cp(sourceDir, destDir, { recursive: true });

    console.log('✓ src directory copied to viewer/src');
  } catch (error) {
    console.error('✗ Failed to copy src directory:', error);
    // This is critical - exit with error if src copy fails
    process.exit(1);
  }
}

async function main() {
  await copySrcDirectory();
  await copyTestResults();
}

main();

