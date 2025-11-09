import { NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string; timestamp: string; filename: string[] }> }
) {
  try {
    const { gameId, timestamp, filename } = await params;
    const filenamePath = Array.isArray(filename) ? filename.join('/') : filename;

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
    
    const filePath = join(resultsDir, gameId, timestamp, filenamePath);

    try {
      const fileBuffer = await readFile(filePath);
      
      // Determine content type based on file extension
      let contentType = 'application/octet-stream';
      if (filenamePath.endsWith('.png')) {
        contentType = 'image/png';
      } else if (filenamePath.endsWith('.jpg') || filenamePath.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (filenamePath.endsWith('.log')) {
        contentType = 'text/plain';
      } else if (filenamePath.endsWith('.json')) {
        contentType = 'application/json';
      }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${filenamePath}"`,
        },
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error serving screenshot:', error);
    return NextResponse.json(
      { error: 'Failed to serve file', message: String(error) },
      { status: 500 }
    );
  }
}

