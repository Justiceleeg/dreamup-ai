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
    // In development, it's relative to the project root
    // In production, tests write to ./test-results (relative to viewer directory)
    // We check both locations: ./test-results (runtime) and public/test-results (static files from build)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const runtimeResultsDir = isDevelopment
      ? join(process.cwd(), '..', 'test-results')
      : join(process.cwd(), 'test-results');
    const staticResultsDir = join(process.cwd(), 'public', 'test-results');
    
    // Try runtime directory first (where new tests write), fallback to static directory
    let resultsDir = runtimeResultsDir;
    try {
      await access(runtimeResultsDir, constants.F_OK);
    } catch {
      // Runtime directory doesn't exist, use static directory
      resultsDir = staticResultsDir;
    }

    const testPath = join(resultsDir, gameId, timestamp);
    const manifestPath = join(testPath, 'manifest.json');

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

      return NextResponse.json({
        manifest,
        consoleLog: consoleLogContent,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
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

