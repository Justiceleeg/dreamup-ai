import { NextResponse } from 'next/server';
import { testGame } from '../../../../src/core/index.js';
import type { QAConfig } from '../../../../src/shared/types.js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameUrl, timeout } = body;

    if (!gameUrl || typeof gameUrl !== 'string') {
      return NextResponse.json(
        { error: 'Invalid gameUrl. Must be a valid URL string.' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(gameUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format.' },
        { status: 400 }
      );
    }

    // For web requests, use appropriate timeout based on platform
    // Railway: No strict limits, can use full 5 minutes
    // Vercel: Limited (10s hobby, 60s pro, 300s enterprise)
    // Default to 5 minutes (300s) for Railway, can be overridden
    // Railway sets RAILWAY_ENVIRONMENT_NAME or RAILWAY_ENVIRONMENT_ID
    const isRailway = !!(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT_ID);
    const defaultTimeout = isRailway
      ? 300000  // 5 minutes for Railway
      : 60000;  // 60 seconds for Vercel (Pro plan)
    const webTimeout = timeout || defaultTimeout;
    const maxTimeout = 300000; // 5 minutes max (matches CLI default)

    const config: QAConfig = {
      gameUrl,
      timeout: Math.min(webTimeout, maxTimeout),
      screenshotCount: 5,
      outputDir: '../test-results', // Relative to viewer directory
      headed: false,
      logLevel: 'info',
    };

    console.log(`🎮 Starting web test for: ${gameUrl}`);

    // Run the test
    const result = await testGame(config);

    console.log(`✅ Web test completed: ${gameUrl}`);

    return NextResponse.json({
      success: true,
      result,
      message: 'Test completed successfully',
    });
  } catch (error) {
    console.error('Error running test:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a timeout error
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      return NextResponse.json(
        {
          error: 'Test timeout',
          message: 'The test exceeded the timeout limit. This may happen on Vercel due to function timeout limits. Try running locally or use a shorter timeout.',
          details: errorMessage,
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: 'Test failed',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

