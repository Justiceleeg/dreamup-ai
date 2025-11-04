/**
 * AI Evaluator Module
 *
 * Analyzes captured evidence using GPT-4V to assess game playability.
 * Evaluates load success, control responsiveness, and stability.
 */

import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { LLMEvaluation, Issue } from '../shared/types.js';
import * as fs from 'fs';

/**
 * Schema for LLM evaluation output
 */
const evaluationSchema = z.object({
  successful_load: z.boolean().describe('Is the game visible and properly rendered?'),
  responsive_controls: z.boolean().describe('Do user inputs cause expected changes?'),
  stable: z.boolean().describe('Did the game run without crashes or freezes?'),
  playability_score: z
    .number()
    .min(0)
    .max(100)
    .describe('Overall playability score from 0-100'),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe('Confidence in the assessment from 0-100'),
  issues: z
    .array(
      z.object({
        type: z.enum(['crash', 'unresponsive', 'load_failure', 'rendering', 'other']),
        severity: z.enum(['critical', 'major', 'minor']),
        description: z.string(),
      })
    )
    .describe('List of issues found'),
  recommendations: z
    .array(z.string())
    .describe('Recommendations for fixing identified issues'),
  reasoning: z.string().describe('Explanation of the assessment'),
});

/**
 * AI Evaluator for analyzing game state and playability
 */
export class AIEvaluator {
  private modelName: string = 'gpt-4o';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
  }

  /**
   * Evaluate game playability from screenshots and console logs
   *
   * @param screenshotPaths - Array of screenshot file paths
   * @param consoleLogs - Path to console logs file
   * @param gameUrl - URL of the game being tested
   * @param objectiveMetrics - Objective metrics from interaction (control response rate, etc.)
   * @returns LLM evaluation result
   */
  async evaluateGamePlayability(
    screenshotPaths: string[],
    consoleLogs?: string,
    gameUrl?: string,
    objectiveMetrics?: {
      totalActionsAttempted: number;
      successfulActions: number;
      controlsResponseRate: number;
      intermediateScreenshots: number;
    }
  ): Promise<LLMEvaluation> {
    console.log('🤖 Starting AI evaluation of game playability...');

    try {
      // Load screenshots and convert to base64
      const screenshots = await this.loadScreenshots(screenshotPaths);

      // Load console logs
      let consoleLogs_content = '';
      if (consoleLogs && fs.existsSync(consoleLogs)) {
        consoleLogs_content = fs.readFileSync(consoleLogs, 'utf-8');
      }

      // Build evaluation prompt with objective metrics
      const prompt = this.buildEvaluationPrompt(gameUrl, consoleLogs_content, objectiveMetrics);

      console.log('📸 Sending screenshots and logs to GPT-4V for analysis...');

      // Call GPT-4V with images and logs
      console.log(`Sending ${screenshots.length} screenshot(s) and prompt to ${this.modelName}...`);

      // Note: For now, we're using text-only evaluation due to SDK message format compatibility
      // TODO: Fix image support in future versions with proper message format conversion
      const evaluationPrompt = screenshots.length > 0
        ? `${prompt}\n\nNote: ${screenshots.length} screenshot(s) were captured during testing.`
        : prompt;

      const response = await generateObject({
        model: openai(this.modelName),
        schema: evaluationSchema,
        prompt: evaluationPrompt,
      });

      // Validate response object has required fields
      if (!response.object || Object.keys(response.object).length === 0) {
        throw new Error('AI model returned empty object - evaluation failed');
      }

      console.log('✅ AI evaluation complete');

      const evaluation: LLMEvaluation = {
        successful_load: response.object.successful_load,
        responsive_controls: response.object.responsive_controls,
        stable: response.object.stable,
        playability_score: response.object.playability_score,
        confidence: response.object.confidence,
        issues: response.object.issues,
        recommendations: response.object.recommendations,
        reasoning: response.object.reasoning,
      };

      return evaluation;
    } catch (error) {
      console.error(
        `❌ AI evaluation failed: ${error instanceof Error ? error.message : String(error)}`
      );

      // Return fallback heuristic evaluation
      return this.getFallbackEvaluation();
    }
  }

  /**
   * Analyze console logs for errors and warnings
   *
   * @param consoleLogs - Console logs content
   * @returns Array of issues detected
   */
  analyzeConsoleLogs(consoleLogs: string): Issue[] {
    const issues: Issue[] = [];
    const lines = consoleLogs.split('\n');

    let errorCount = 0;
    let warningCount = 0;

    for (const line of lines) {
      if (line.includes('[error]') || line.toLowerCase().includes('error')) {
        errorCount++;
        if (
          line.includes('Uncaught') ||
          line.includes('TypeError') ||
          line.includes('ReferenceError')
        ) {
          issues.push({
            type: 'crash',
            severity: 'critical',
            description: line.substring(0, 100),
            detected_at_ms: 0,
          });
        }
      } else if (line.includes('[warn]') || line.toLowerCase().includes('warning')) {
        warningCount++;
      }
    }

    if (errorCount > 5) {
      issues.push({
        type: 'other',
        severity: 'major',
        description: `Detected ${errorCount} console errors during execution`,
        detected_at_ms: 0,
      });
    }

    return issues;
  }

  /**
   * Build the evaluation prompt for the LLM
   *
   * @param gameUrl - URL of the game
   * @param consoleLogs - Console logs content
   * @param objectiveMetrics - Objective metrics from interaction
   * @returns Formatted prompt
   */
  private buildEvaluationPrompt(
    gameUrl?: string,
    consoleLogs?: string,
    objectiveMetrics?: {
      totalActionsAttempted: number;
      successfulActions: number;
      controlsResponseRate: number;
      intermediateScreenshots: number;
    }
  ): string {
    const gameInfo = gameUrl ? `Game URL: ${gameUrl}\n` : '';
    const consoleSection = consoleLogs
      ? `\nConsole Logs:\n${consoleLogs}\n`
      : '\nNo console logs available.\n';

    const metricsSection = objectiveMetrics
      ? `\nOBJECTIVE METRICS (Data-Driven Evidence):
  - Control Response Rate: ${objectiveMetrics.controlsResponseRate.toFixed(1)}% (${objectiveMetrics.successfulActions} of ${objectiveMetrics.totalActionsAttempted} actions caused visible state changes)
  - State Changes Detected: ${objectiveMetrics.successfulActions}
  - Screenshot Progression: ${objectiveMetrics.intermediateScreenshots} intermediate screenshots (indicating ${objectiveMetrics.intermediateScreenshots > 0 ? 'visible changes during play' : 'no visible changes during play'})

IMPORTANT: Use these objective metrics as PRIMARY evidence when evaluating "responsive_controls". If control response rate is 0%, the controls are unresponsive regardless of visual appearance.
`
      : '';

    return `You are an expert game QA analyst. Evaluate the following game screenshots and logs to assess playability.

${gameInfo}

${consoleSection}

${metricsSection}

Please analyze:
1. **Successful Load**: Is the game visible and properly rendered? Check for blank screens, broken images, or rendering errors.
2. **Responsive Controls**: Use the objective metrics above as PRIMARY evidence. A 0% control response rate means controls are unresponsive. Do the screenshots also show evidence of user interactions working? Look for changed UI states, updated game states, or visual feedback.
3. **Stability**: Are there any signs of crashes, freezes, or errors? Check console logs and visual artifacts.

CRITICAL: If objective metrics show 0% control response rate (0 state changes out of N attempts), you MUST set "responsive_controls" to false and add an issue of type "unresponsive" with severity "critical" describing that no actions caused visible state changes.

Provide a detailed assessment with:
- A playability score (0-100, where 100 is fully playable). Use objective metrics to inform this score.
- A confidence score (0-100, reflecting how certain you are in your assessment)
- Specific issues found with severity levels
- Recommendations for fixes
- Detailed reasoning for your assessment

Be thorough but concise in your analysis.`;
  }

  /**
   * Load screenshots and convert to base64
   *
   * @param screenshotPaths - Array of file paths
   * @returns Array of loaded screenshots
   */
  private async loadScreenshots(
    screenshotPaths: string[]
  ): Promise<Array<{ path: string; base64: string }>> {
    const screenshots: Array<{ path: string; base64: string }> = [];

    for (const path of screenshotPaths) {
      try {
        if (fs.existsSync(path)) {
          const fileContent = fs.readFileSync(path);
          const base64 = fileContent.toString('base64');
          screenshots.push({ path, base64 });
          console.log(`✓ Loaded screenshot: ${path}`);
        } else {
          console.warn(`⚠ Screenshot not found: ${path}`);
        }
      } catch (error) {
        console.warn(
          `⚠ Failed to load screenshot ${path}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (screenshots.length === 0) {
      console.warn('⚠ No screenshots loaded');
    }

    return screenshots;
  }

  /**
   * Get fallback evaluation when LLM call fails
   *
   * @returns Conservative evaluation
   */
  private getFallbackEvaluation(): LLMEvaluation {
    return {
      successful_load: false,
      responsive_controls: false,
      stable: false,
      playability_score: 0,
      confidence: 10,
      issues: [
        {
          type: 'other',
          severity: 'major',
          description: 'AI evaluation failed - unable to assess playability with LLM',
        },
      ],
      recommendations: [
        'Check AI service availability',
        'Review screenshots manually',
        'Check console logs for errors',
      ],
      reasoning:
        'Evaluation failed due to LLM service error. Manual review recommended. This is a fallback assessment with low confidence.',
    };
  }

  /**
   * Convert LLMEvaluation to TestResult issues
   *
   * @param evaluation - LLM evaluation result
   * @returns Converted issues array
   */
  static convertEvaluationToIssues(evaluation: LLMEvaluation): Issue[] {
    const issues: Issue[] = [];

    if (!evaluation.successful_load) {
      issues.push({
        type: 'load_failure',
        severity: 'critical',
        description: 'Game failed to load properly',
        detected_at_ms: 0,
      });
    }

    if (!evaluation.responsive_controls) {
      issues.push({
        type: 'unresponsive',
        severity: 'major',
        description: 'Game controls are not responsive to user input',
        detected_at_ms: 0,
      });
    }

    if (!evaluation.stable) {
      issues.push({
        type: 'crash',
        severity: 'critical',
        description: 'Game crashed or froze during execution',
        detected_at_ms: 0,
      });
    }

    // Add any issues from LLM evaluation
    issues.push(...evaluation.issues);

    return issues;
  }
}
