import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
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
    const isDevelopment = process.env.NODE_ENV === 'development';
    const resultsDir = isDevelopment
      ? join(process.cwd(), '..', 'test-results')
      : join(process.cwd(), 'public', 'test-results');

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

