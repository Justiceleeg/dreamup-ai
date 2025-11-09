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
  // When Railway builds from viewer directory, we're already in /app (viewer)
  // Try multiple possible locations for test-results directory
  const currentDir = process.cwd();
  const scriptDir = __dirname;
  
  const possibleTestResultsDirs = [
    join(scriptDir, '../..', 'test-results'),  // From viewer/scripts: ../../test-results
    join(currentDir, '..', 'test-results'),     // From viewer: ../test-results
    join(currentDir, 'test-results'),           // Already in project root: ./test-results
  ];
  
  let sourceDir = null;
  for (const dir of possibleTestResultsDirs) {
    try {
      await access(dir, constants.F_OK);
      sourceDir = dir;
      break;
    } catch {
      // Try next location
      continue;
    }
  }
  
  // Destination is always relative to current directory (viewer)
  const destDir = join(currentDir, 'public', 'test-results');

  try {
    if (!sourceDir) {
      console.warn('⚠ test-results directory not found, skipping copy');
      // Create empty directory so build doesn't fail
      await mkdir(destDir, { recursive: true });
      return;
    }

    // Create destination directory if it doesn't exist
    await mkdir(destDir, { recursive: true });

    // Copy test-results to public directory
    await cp(sourceDir, destDir, { recursive: true });

    console.log(`✓ Test results copied from ${sourceDir} to ${destDir}`);
  } catch (error) {
    console.error('✗ Failed to copy test results:', error);
    // Don't exit with error code - allow build to continue even if copy fails
  }
}

async function copySrcDirectory() {
  // When Railway builds from viewer directory, we're already in /app (viewer)
  // The src directory should be at the project root, which is one level up
  // But if Railway is building from project root, we need to check both locations
  const currentDir = process.cwd();
  const scriptDir = __dirname;
  
  // Try multiple possible locations for src directory
  const possibleSrcDirs = [
    join(scriptDir, '../..', 'src'),        // From viewer/scripts: ../../src (project root)
    join(currentDir, '..', 'src'),          // From viewer: ../src (project root)
    join(currentDir, 'src'),                // Already in project root: ./src
    join('/app', '..', 'src'),              // Railway build context: ../src from /app
  ];
  
  let sourceDir = null;
  for (const dir of possibleSrcDirs) {
    try {
      await access(dir, constants.F_OK);
      sourceDir = dir;
      break;
    } catch {
      // Try next location
      continue;
    }
  }
  
  if (!sourceDir) {
    console.warn('⚠ src directory not found in any expected location, skipping copy');
    console.warn('  Tried locations:', possibleSrcDirs.map(d => d.replace(process.cwd(), '.')).join(', '));
    return;
  }

  // Destination is always relative to current directory (viewer)
  const destDir = join(currentDir, 'src');

  try {
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

    console.log(`✓ src directory copied from ${sourceDir} to ${destDir}`);
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

