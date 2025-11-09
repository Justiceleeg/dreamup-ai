import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string; timestamp: string; filename: string[] }> }
) {
  try {
    const { gameId, timestamp, filename } = await params;
    const filenamePath = Array.isArray(filename) ? filename.join('/') : filename;

    // In development, read from the actual test-results directory
    const resultsDir = join(process.cwd(), '..', 'test-results');
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

