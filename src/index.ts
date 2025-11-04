#!/usr/bin/env node

/**
 * DreamUp QA Pipeline - Main Entry Point
 * Autonomous AI agent for testing browser games
 */

export { testGame } from './core/index.js';

// If this is the main module, run the CLI
import { testGame } from './core/index.js';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: qa-agent <gameUrl> [options]');
  console.error('Example: qa-agent https://example.com/game');
  process.exit(1);
}

const gameUrl = args[0];

// Parse options
const options: { [key: string]: any } = {
  timeout: 300000,
  screenshots: 5,
  output: './test-results',
  headed: false,
};

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--timeout' && i + 1 < args.length) {
    options.timeout = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--screenshots' && i + 1 < args.length) {
    options.screenshots = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--output' && i + 1 < args.length) {
    options.output = args[i + 1];
    i++;
  } else if (args[i] === '--headed') {
    options.headed = true;
  }
}

const config = {
  gameUrl,
  timeout: options.timeout,
  screenshotCount: options.screenshots,
  outputDir: options.output,
  headed: options.headed,
  logLevel: 'info',
};

testGame(config)
  .then((result) => {
    console.log('✅ Test completed');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.status === 'pass' ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
