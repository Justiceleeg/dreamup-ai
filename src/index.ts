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
import { ActionOrchestrator } from './action-orchestrator.js';
import { AIEvaluator } from './ai-evaluator.js';

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
  const orchestrator = new ActionOrchestrator(5, 5000, 3000);
  let evaluator: AIEvaluator | null = null;

  try {
    // Initialize browser
    await agent.initializeBrowser();

    // Load game
    const page = await agent.loadGame(config.gameUrl);

    // Setup evidence capture
    // In Stagehand V3, get the actual page object from context
    const pages = (page as any).context?.pages?.();
    if (pages && pages.length > 0) {
      evidence.setupConsoleCapture(pages[0]);
    }

    // Get page info
    const pageTitle = await agent.getPageTitle();
    const currentUrl = await agent.getCurrentUrl();

    console.log(`📄 Page title: ${pageTitle}`);
    console.log(`🔗 Current URL: ${currentUrl}`);

    // Capture screenshot of loaded game (initial state)
    const stagehandPage = pages?.[0];
    if (stagehandPage) {
      await evidence.captureScreenshot(stagehandPage, 'Initial game load');
    }

    // Layer 2: Orchestrate autonomous interaction
    console.log('\n🤖 Beginning autonomous game interaction...');
    orchestrator.setPage(page);

    // Execute 2-3 interaction cycles
    const actionCount = Math.min(3, config.timeout ? Math.floor(config.timeout / 30000) : 1);
    console.log(`📍 Executing ${actionCount} interaction cycle(s)...`);

    const executedActions = await orchestrator.executeMultipleCycles(actionCount);

    // Capture screenshot after interactions
    if (executedActions.length > 0 && stagehandPage) {
      await evidence.captureScreenshot(stagehandPage, 'After autonomous interaction');
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
        actions_performed: executedActions.length,
        screens_navigated: orchestrator.getStateHistory().length,
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
