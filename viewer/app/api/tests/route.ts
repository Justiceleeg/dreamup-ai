import { NextResponse } from 'next/server';
import { readdir, readFile, stat, access } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';

interface TestManifest {
  gameId: string;
  testId: string;
  timestamp: string;
  gameUrl: string;
  screenshots: Array<{
    filename: string;
    timestamp: number;
    url: string;
    description: string;
    index: number;
  }>;
  consoleLogs: Array<{
    level: string;
    message: string;
    timestamp: number;
  }>;
  testStartTime: number;
  testEndTime?: number;
  totalDuration?: number;
}

interface TestRun {
  gameId: string;
  timestamp: string;
  gameUrl: string;
  testId: string;
  screenshotCount: number;
  hasConsoleLogs: boolean;
  totalDuration?: number;
  testStartTime: number;
}

export async function GET() {
  try {
    // Determine the test-results directory path
    // In production on Railway: /app/test-results (written by CLI subprocess)
    // In development: ../test-results
    const isDevelopment = process.env.NODE_ENV === 'development';
    const projectRoot = isDevelopment ? join(process.cwd(), '..') : '/app';
    const runtimeResultsDir = join(projectRoot, 'test-results');
    const staticResultsDir = join(process.cwd(), 'public', 'test-results');
    
    console.log('🔍 Checking for test results...');
    console.log(`  Runtime dir: ${runtimeResultsDir}`);
    console.log(`  Static dir: ${staticResultsDir}`);
    
    // Try runtime directory first (where new tests write), fallback to static directory
    let resultsDir = runtimeResultsDir;
    let usingStatic = false;
    try {
      await access(runtimeResultsDir, constants.F_OK);
      console.log(`✓ Found runtime results dir: ${runtimeResultsDir}`);
    } catch {
      // Runtime directory doesn't exist, use static directory
      console.log(`⚠ Runtime dir not found, trying static: ${staticResultsDir}`);
      resultsDir = staticResultsDir;
      usingStatic = true;
      try {
        await access(staticResultsDir, constants.F_OK);
        console.log(`✓ Found static results dir: ${staticResultsDir}`);
      } catch {
        console.log(`✗ Static dir also not found`);
        return NextResponse.json({ tests: [], debug: { runtimeResultsDir, staticResultsDir, found: false } });
      }
    }

    const testRuns: TestRun[] = [];
    console.log(`📂 Reading test results from: ${resultsDir}`);

    try {
      // Read all game directories
      const gameDirs = await readdir(resultsDir, { withFileTypes: true });
      
      for (const gameDir of gameDirs) {
        if (!gameDir.isDirectory()) continue;

        const gameId = gameDir.name;
        const gamePath = join(resultsDir, gameId);

        // Read all timestamp directories for this game
        const timestampDirs = await readdir(gamePath, { withFileTypes: true });

        for (const timestampDir of timestampDirs) {
          if (!timestampDir.isDirectory()) continue;

          const timestamp = timestampDir.name;
          const testPath = join(gamePath, timestamp);
          const manifestPath = join(testPath, 'manifest.json');

          try {
            // Read and parse manifest.json
            const manifestContent = await readFile(manifestPath, 'utf-8');
            const manifest: TestManifest = JSON.parse(manifestContent);

            testRuns.push({
              gameId: manifest.gameId,
              timestamp: manifest.timestamp,
              gameUrl: manifest.gameUrl,
              testId: manifest.testId,
              screenshotCount: manifest.screenshots.length,
              hasConsoleLogs: manifest.consoleLogs.length > 0,
              totalDuration: manifest.totalDuration,
              testStartTime: manifest.testStartTime,
            });
          } catch (error) {
            // Skip if manifest.json doesn't exist or is invalid
            console.warn(`Failed to read manifest for ${gameId}/${timestamp}:`, error);
            continue;
          }
        }
      }
    } catch (error) {
      // If test-results directory doesn't exist, return empty array
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({ tests: [] });
      }
      throw error;
    }

    // Sort by timestamp (newest first)
    testRuns.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    console.log(`✓ Found ${testRuns.length} test run(s)`);
    return NextResponse.json({ 
      tests: testRuns,
      debug: { 
        resultsDir, 
        usingStatic: usingStatic || false, 
        count: testRuns.length 
      }
    });
  } catch (error) {
    console.error('Error reading test results:', error);
    return NextResponse.json(
      { error: 'Failed to read test results', message: String(error) },
      { status: 500 }
    );
  }
}

