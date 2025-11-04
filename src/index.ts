#!/usr/bin/env bun

/**
 * DreamUp QA Pipeline - Main Entry Point
 *
 * Autonomous AI agent for testing browser games
 */

import { Command } from 'commander';
import type { QAConfig, TestResult } from './types.js';
import { BrowserAgent } from './browser-agent.js';
import { EvidenceCapture } from './evidence-capture.js';

const VERSION = '1.0.0';

/**
 * Main QA test function
 *
 * @param config - Configuration for the test
 * @returns Test result
 */
export async function testGame(config: QAConfig): Promise<TestResult> {
  console.log(`🎮 Starting QA test for: ${config.gameUrl}`);

  const startTime = Date.now();
  const agent = new BrowserAgent(config.timeout);
  const evidence = new EvidenceCapture(config.gameUrl, config.outputDir);

  try {
    // Initialize browser
    await agent.initializeBrowser();

    // Load game
    const page = await agent.loadGame(config.gameUrl);

    // Setup evidence capture
    evidence.setupConsoleCapture(page);

    // Get page info
    const pageTitle = await agent.getPageTitle();
    const currentUrl = await agent.getCurrentUrl();

    console.log(`📄 Page title: ${pageTitle}`);
    console.log(`🔗 Current URL: ${currentUrl}`);

    // Capture screenshot of loaded game
    await evidence.captureScreenshot(page, 'Initial game load');

    // Save evidence artifacts
    const consoleLogPath = await evidence.saveConsoleLogs();
    const manifestPath = await evidence.saveManifest(config.gameUrl);
    const screenshotPaths = evidence.getScreenshotPaths();

    // Return successful result
    const result: TestResult = {
      status: 'pass',
      gameUrl: config.gameUrl,
      playability_score: 50, // Placeholder
      confidence: 30, // Placeholder
      timestamp: new Date().toISOString(),
      execution_time_ms: Date.now() - startTime,
      issues: [],
      screenshots: screenshotPaths,
      console_logs: consoleLogPath,
      metadata: {
        actions_performed: 0,
        screens_navigated: 1,
        browser_errors: 0,
        agent_version: VERSION,
      },
    };

    console.log(`✅ Test completed successfully`);
    console.log(`📁 Results saved to: ${evidence.getTestDir()}`);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Test failed: ${errorMsg}`);

    // Try to save whatever evidence we have
    try {
      await evidence.saveConsoleLogs();
      await evidence.saveManifest(config.gameUrl);
    } catch (saveError) {
      console.warn(`Could not save evidence: ${saveError}`);
    }

    return {
      status: 'error',
      gameUrl: config.gameUrl,
      playability_score: 0,
      confidence: 0,
      timestamp: new Date().toISOString(),
      execution_time_ms: Date.now() - startTime,
      issues: [
        {
          type: 'load_failure',
          severity: 'critical',
          description: errorMsg,
          detected_at_ms: 0,
        },
      ],
      screenshots: evidence.getScreenshotPaths(),
      console_logs: undefined,
      metadata: {
        actions_performed: 0,
        screens_navigated: 0,
        browser_errors: 1,
        agent_version: VERSION,
      },
    };
  } finally {
    // Always cleanup
    await agent.cleanup();
  }
}

/**
 * CLI Interface
 */
function setupCLI(): void {
  const program = new Command();

  program
    .version(VERSION)
    .description('DreamUp QA Pipeline - Autonomous game testing agent')
    .argument('<gameUrl>', 'URL of the game to test')
    .option('--timeout <ms>', 'Maximum execution time in milliseconds', '300000')
    .option('--screenshots <n>', 'Number of screenshots to capture', '5')
    .option('--output <dir>', 'Output directory for test results', './test-results')
    .option('--headed', 'Run browser in headed mode (for debugging)')
    .action(async (gameUrl: string, options) => {
      const config: QAConfig = {
        gameUrl,
        timeout: parseInt(options.timeout),
        screenshotCount: parseInt(options.screenshots),
        outputDir: options.output,
        headed: options.headed || false,
        logLevel: 'info',
      };

      try {
        const result = await testGame(config);
        console.log('✅ Test completed');
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.status === 'pass' ? 0 : 1);
      } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
      }
    });

  program.parse(process.argv);
}

// Only run CLI if this is the main module
if (import.meta.main) {
  setupCLI();
}
