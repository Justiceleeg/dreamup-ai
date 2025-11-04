#!/usr/bin/env bun

/**
 * DreamUp QA Pipeline - Main Entry Point
 *
 * Autonomous AI agent for testing browser games
 */

import { Command } from 'commander';
import type { QAConfig, TestResult } from '../shared/types.js';
import { BrowserAgent } from '../browser/browser-agent.js';
import { EvidenceCapture } from '../evidence/evidence-capture.js';
import { ImprovedGameInteractor } from '../interaction/improved-game-interactor.js';
import { AIEvaluator } from '../evaluation/ai-evaluator.js';

const VERSION = '2.0.0'; // Updated for Layer 2

/**
 * Main QA test function with Layer 2 support
 *
 * @param config - Configuration for the test
 * @returns Test result with AI evaluation
 */
export async function testGame(config: QAConfig): Promise<TestResult> {
  console.log(`🎮 Starting QA test for: ${config.gameUrl}`);

  const startTime = Date.now();
  const agent = new BrowserAgent(config.timeout);
  const evidence = new EvidenceCapture(config.gameUrl, config.outputDir);
  const interactor = new ImprovedGameInteractor();
  let evaluator: AIEvaluator | null = null;

  try {
    // Initialize browser
    await agent.initializeBrowser();

    // Load game
    const page = await agent.loadGame(config.gameUrl);

    // Setup evidence capture
    // In Stagehand V3, get the actual page object from context
    const pages = (page as any).context?.pages?.();
    if (pages && pages.length === 0) {
      throw new Error('No pages available in browser context');
    }

    const playwrightPage = pages[0];
    evidence.setupConsoleCapture(playwrightPage);

    // Get page info
    const pageTitle = await agent.getPageTitle();
    const currentUrl = await agent.getCurrentUrl();

    console.log(`📄 Page title: ${pageTitle}`);
    console.log(`🔗 Current URL: ${currentUrl}`);

    // Capture screenshot of loaded game (initial state)
    const initialScreenshotPath = await evidence.captureScreenshot(playwrightPage, 'Initial game load');

    // Layer 3-2: Intelligent game analysis and interaction
    console.log('\n🤖 Beginning intelligent game interaction...');
    interactor.setPage(page);

    try {
      // Configure screenshot strategy based on screenshotCount config
      // If screenshotCount >= 3, capture intermediate screenshots (up to 3)
      // If screenshotCount < 3, only capture initial and final
      const captureIntermediates = (config.screenshotCount || 5) >= 3;
      interactor.setScreenshotStrategy(captureIntermediates);

      // Analyze game and build smart action set
      await interactor.initializeInteraction(playwrightPage, initialScreenshotPath);

      // Execute multiple interaction cycles with state detection
      // Allocate ~2 seconds per action, max 10 actions
      const timePerAction = 2000; // 2 seconds
      const maxActions = 10;
      const maxInteractionTime = config.timeout ? Math.min(config.timeout * 0.8, maxActions * timePerAction) : maxActions * timePerAction;
      const interactionStartTime = Date.now();

      let successfulActions = 0;
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 3; // Stop if 3 actions fail in a row

      console.log(`📍 Executing up to ${maxActions} actions (${(maxInteractionTime / 1000).toFixed(1)}s available)...`);
      console.log(`📸 Screenshot strategy: ${captureIntermediates ? 'capture intermediates (max 3)' : 'initial + final only'}`);

      for (let actionNum = 0; actionNum < maxActions; actionNum++) {
        // Check if we're running out of time
        const elapsedTime = Date.now() - interactionStartTime;
        if (elapsedTime > maxInteractionTime) {
          console.log(`ℹ Time limit reached (${(elapsedTime / 1000).toFixed(1)}s), stopping interaction`);
          break;
        }

        console.log(`\n📍 Action ${actionNum + 1}/${maxActions}`);

        // Get last screenshot for comparison
        const screenshotPaths = interactor.getScreenshotPaths();
        const lastScreenshot = screenshotPaths[screenshotPaths.length - 1];

        // Execute action with state change detection
        const stateChanged = await interactor.executeActionCycleWithDetection(evidence, lastScreenshot);

        if (stateChanged) {
          successfulActions++;
          consecutiveFailures = 0;
        } else {
          consecutiveFailures++;
          console.log(`ℹ No state change (${consecutiveFailures}/${maxConsecutiveFailures})`);

          // Stop if too many consecutive failures
          if (consecutiveFailures >= maxConsecutiveFailures) {
            console.log('ℹ Too many consecutive failures, stopping interaction');
            break;
          }
        }
      }

      // Capture final screenshot after interaction completes
      await interactor.captureFinalScreenshot(evidence);

      console.log(
        `\n✓ Interaction complete - ${interactor.getActionHistory().length} actions executed, ${successfulActions} caused state changes`
      );
    } catch (interactionError) {
      console.warn(
        `⚠ Game interaction error: ${interactionError instanceof Error ? interactionError.message : String(interactionError)}`
      );
      // Continue to evaluation even if interaction fails
    }

    // Save evidence artifacts
    const consoleLogPath = await evidence.saveConsoleLogs();
    const manifestPath = await evidence.saveManifest(config.gameUrl);
    const screenshotPaths = evidence.getScreenshotPaths();

    // Layer 2: AI Evaluation
    console.log('\n🔍 Evaluating game playability with AI...');
    evaluator = new AIEvaluator();
    const evaluation = await evaluator.evaluateGamePlayability(
      screenshotPaths,
      consoleLogPath,
      config.gameUrl
    );

    // Convert evaluation to issues
    const evaluationIssues = AIEvaluator.convertEvaluationToIssues(evaluation);

    // Determine overall status
    const status =
      evaluation.playability_score >= 60
        ? 'pass'
        : evaluation.playability_score >= 30
          ? 'fail'
          : 'error';

    // Return result with AI evaluation
    const result: TestResult = {
      status,
      gameUrl: config.gameUrl,
      playability_score: evaluation.playability_score,
      confidence: evaluation.confidence,
      timestamp: new Date().toISOString(),
      execution_time_ms: Date.now() - startTime,
      issues: evaluationIssues,
      screenshots: screenshotPaths,
      console_logs: consoleLogPath,
      metadata: {
        actions_performed: interactor.getActionHistory().length,
        screenshots_captured: interactor.getScreenshotPaths().length,
        browser_errors: evidence.getConsoleLogs().filter((l) => l.includes('[error]')).length,
        agent_version: VERSION,
        evaluation_reasoning: evaluation.reasoning,
      },
    };

    console.log(
      `\n✅ Test completed - Playability Score: ${evaluation.playability_score}/100 (Confidence: ${evaluation.confidence}%)`
    );
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
