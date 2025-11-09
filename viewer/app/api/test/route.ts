import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';

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

    // Detect if running on Railway
    const isRailway = !!(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT_ID);
    const defaultTimeout = isRailway ? 300000 : 60000; // 5 min on Railway, 60s elsewhere
    const testTimeout = timeout || defaultTimeout;

    console.log(`🎮 Starting CLI test for: ${gameUrl}`);
    console.log(`⏱️  Timeout: ${testTimeout}ms`);

    // Run CLI as subprocess
    // In production (Railway): /app/src/index.ts
    // In development: ../src/index.ts
    const isDev = process.env.NODE_ENV === 'development';
    const projectRoot = isDev ? join(process.cwd(), '..') : '/app';
    const cliPath = join(projectRoot, 'src', 'index.ts');
    const outputDir = join(projectRoot, 'test-results');

    console.log(`📂 Project root: ${projectRoot}`);
    console.log(`📄 CLI path: ${cliPath}`);
    console.log(`📁 Output dir: ${outputDir}`);

    const args = [
      cliPath,
      gameUrl,
      '--timeout', testTimeout.toString(),
      '--output', outputDir,
    ];

    console.log(`🚀 Running: node --loader tsx ${args.join(' ')}`);

    const childProcess = spawn('node', ['--loader', 'tsx', ...args], {
      cwd: projectRoot,
      env: { ...process.env },
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(output);
    });

    childProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(output);
    });

    // Wait for process to complete with timeout
    const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const killTimeout = setTimeout(() => {
        console.warn('⚠️  Process timeout, killing...');
        childProcess.kill('SIGTERM');
        setTimeout(() => childProcess.kill('SIGKILL'), 5000); // Force kill after 5s
        reject(new Error(`Test timeout after ${testTimeout}ms`));
      }, testTimeout + 10000); // Add 10s buffer for process cleanup

      childProcess.on('close', (code) => {
        clearTimeout(killTimeout);
        resolve({ code, stdout, stderr });
      });

      childProcess.on('error', (error) => {
        clearTimeout(killTimeout);
        reject(error);
      });
    });

    if (result.code === 0) {
      console.log(`✅ CLI test completed successfully`);
      return NextResponse.json({
        success: true,
        message: 'Test completed successfully',
        output: result.stdout,
      });
    } else {
      console.error(`❌ CLI test failed with code ${result.code}`);
      return NextResponse.json(
        {
          error: 'Test failed',
          message: `CLI exited with code ${result.code}`,
          output: result.stdout,
          stderr: result.stderr,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Error running CLI test:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      return NextResponse.json(
        {
          error: 'Test timeout',
          message: 'The test exceeded the timeout limit.',
          details: errorMessage,
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: 'Test execution failed',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

