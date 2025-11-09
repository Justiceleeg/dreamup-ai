import { NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
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
    args?: string[];
  }>;
  testStartTime: number;
  testEndTime?: number;
  totalDuration?: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string; timestamp: string }> }
) {
  try {
    const { gameId, timestamp } = await params;

    // Determine the test-results directory path
    // On Railway, standalone Next.js runs from /app/viewer/.next/standalone/viewer/
    // But CLI writes to /app/test-results/
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // In production (Railway): always use /app/test-results
    // In development: use ../test-results (relative to viewer directory)
    const runtimeResultsDir = isDevelopment 
      ? join(process.cwd(), '..', 'test-results')
      : '/app/test-results';
    const staticResultsDir = join(process.cwd(), 'public', 'test-results');
    
    console.log(`📄 Fetching test details: ${gameId}/${timestamp}`);
    console.log(`  Runtime dir: ${runtimeResultsDir}`);
    console.log(`  Static dir: ${staticResultsDir}`);
    
    // Try runtime directory first (where new tests write), fallback to static directory
    let resultsDir = runtimeResultsDir;
    try {
      await access(runtimeResultsDir, constants.F_OK);
      console.log(`✓ Using runtime dir: ${runtimeResultsDir}`);
    } catch (error) {
      // Runtime directory doesn't exist, use static directory
      console.log(`⚠ Runtime dir not found, using static: ${staticResultsDir}`);
      resultsDir = staticResultsDir;
    }

    const testPath = join(resultsDir, gameId, timestamp);
    const manifestPath = join(testPath, 'manifest.json');
    
    console.log(`  Test path: ${testPath}`);
    console.log(`  Manifest path: ${manifestPath}`);

    try {
      // Read and parse manifest.json
      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest: TestManifest = JSON.parse(manifestContent);

      // Try to read console.log if it exists
      let consoleLogContent = '';
      try {
        const consoleLogPath = join(testPath, 'console.log');
        consoleLogContent = await readFile(consoleLogPath, 'utf-8');
      } catch {
        // Console log doesn't exist or can't be read, that's okay
      }

      // Try to read test-output.json if it exists (the CLI's JSON output)
      let testOutput: any = null;
      try {
        const testOutputPath = join(testPath, 'test-output.json');
        const testOutputContent = await readFile(testOutputPath, 'utf-8');
        testOutput = JSON.parse(testOutputContent);
      } catch {
        // Test output doesn't exist, use manifest data to build it
        // The manifest itself contains the test results
        testOutput = manifest;
      }

      console.log(`✓ Test details loaded successfully`);
      return NextResponse.json({
        manifest,
        consoleLog: consoleLogContent,
        testOutput,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.error(`✗ Test not found: ${manifestPath}`);
        return NextResponse.json(
          { error: 'Test not found' },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error reading test details:', error);
    return NextResponse.json(
      { error: 'Failed to read test details', message: String(error) },
      { status: 500 }
    );
  }
}

