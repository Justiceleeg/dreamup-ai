/**
 * Improved Game Interactor Module
 *
 * Enhanced interaction with games using:
 * - Game analysis (determine controls from HTML/vision)
 * - Smart action sets (keyboard, mouse, waits)
 * - Retry logic with action variations
 * - State change detection (know when actions work)
 */

import type { Stagehand } from '@browserbasehq/stagehand';
import type { Action, ActionResult } from '../shared/types.js';
import { GameAnalyzer } from '../game-analysis/game-analyzer.js';
import { ActionSetBuilder } from '../game-analysis/action-set-builder.js';
import { StateChangeDetector } from '../detection/state-change-detector.js';
import { EvidenceCapture } from '../evidence/evidence-capture.js';

/**
 * Improved game interactor with intelligent action selection and retry logic
 */
export class ImprovedGameInteractor {
  private stagehand: Stagehand | null = null;
  private gameAnalyzer: GameAnalyzer;
  private actionSetBuilder: ActionSetBuilder;
  private stateDetector: StateChangeDetector;
  private actionHistory: Action[] = [];
  private currentActionSet: Action[] = [];
  private currentActionIndex: number = 0;
  private failedActions: Map<string, number> = new Map(); // Track failures for retry logic
  private screenshotPaths: string[] = [];

  constructor() {
    this.gameAnalyzer = new GameAnalyzer();
    this.actionSetBuilder = new ActionSetBuilder();
    this.stateDetector = new StateChangeDetector();
  }

  /**
   * Set the Stagehand instance
   */
  setPage(stagehand: Stagehand): void {
    this.stagehand = stagehand;
  }

  /**
   * Initialize interaction with a game
   * Analyzes the game and builds action set
   *
   * @param page - Playwright page object (from context.pages()[0])
   * @param screenshotPath - Path to initial screenshot
   */
  async initializeInteraction(page: any, screenshotPath: string): Promise<void> {
    console.log('🎮 Initializing improved game interactor...');

    try {
      // Analyze the game
      const gameAnalysis = await this.gameAnalyzer.analyzeGame(page, screenshotPath);

      console.log(`✓ Game identified: ${gameAnalysis.gameName}`);
      console.log(`  Confidence: ${gameAnalysis.confidence}%`);

      // Build action set based on analysis
      this.currentActionSet = this.actionSetBuilder.buildActionSet(gameAnalysis);
      this.currentActionIndex = 0;

      console.log(`✓ Action set built: ${this.currentActionSet.length} actions`);
    } catch (error) {
      console.warn(
        `⚠ Game analysis failed, using default action set: ${error instanceof Error ? error.message : String(error)}`
      );

      // Fallback to default action set
      this.currentActionSet = this.getDefaultActionSet();
    }

    this.screenshotPaths = [screenshotPath];
  }

  /**
   * Execute next action from the action set with retry logic
   *
   * @returns Action result
   */
  async executeNextAction(): Promise<ActionResult | null> {
    if (!this.stagehand) {
      throw new Error('No Stagehand instance set');
    }

    if (this.currentActionIndex >= this.currentActionSet.length) {
      console.log('ℹ All actions exhausted, cycling through action set again');
      this.currentActionIndex = 0;
    }

    const action = this.currentActionSet[this.currentActionIndex];
    this.currentActionIndex++;

    console.log(`🎯 Executing action ${this.currentActionIndex}/${this.currentActionSet.length}: ${action.type}`);

    try {
      const result = await this.executeAction(action);

      // Track in history
      this.actionHistory.push(action);

      // Reset failure count on success
      const actionKey = `${action.type}-${action.value || action.target}`;
      this.failedActions.delete(actionKey);

      return result;
    } catch (error) {
      // Track failure
      const actionKey = `${action.type}-${action.value || action.target}`;
      const failureCount = (this.failedActions.get(actionKey) || 0) + 1;
      this.failedActions.set(actionKey, failureCount);

      console.warn(`⚠ Action failed (attempt ${failureCount}): ${error}`);

      // If action failed too many times, skip it and try next
      if (failureCount > 2) {
        console.log(`⏭ Skipping repeatedly-failed action, moving to next...`);
        this.failedActions.delete(actionKey);
      }

      return null;
    }
  }

  /**
   * Execute action with Stagehand
   */
  private async executeAction(action: Action): Promise<ActionResult> {
    if (!this.stagehand) {
      throw new Error('No Stagehand instance');
    }

    const startTime = Date.now();

    try {
      switch (action.type) {
        case 'key':
          await this.stagehand.act(`Press the ${action.value} key`);
          break;

        case 'click':
          if (action.target?.includes('center')) {
            // Click canvas center
            await this.stagehand.act('Click on the game canvas in the center');
          } else if (action.target === 'button') {
            // Click first button
            await this.stagehand.act('Click the first button on the page');
          } else {
            // Generic click
            await this.stagehand.act(`Click on ${action.value || 'the page'}`);
          }
          break;

        case 'wait':
          const duration = action.duration || 1000;
          await new Promise((resolve) => setTimeout(resolve, duration));
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      return {
        success: true,
        executedAt: Date.now(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(
        `Failed to execute ${action.type} action: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute interaction cycle with state change detection
   * Captures screenshot after action and compares with before
   *
   * @param evidence - EvidenceCapture instance for screenshots
   * @param beforeScreenshot - Path to screenshot before action
   * @returns Whether state changed
   */
  async executeActionCycleWithDetection(
    evidence: EvidenceCapture,
    beforeScreenshot: string
  ): Promise<boolean> {
    // Execute action
    const result = await this.executeNextAction();

    if (!result) {
      return false;
    }

    // Small wait for changes to settle
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Capture after screenshot
    const pages = (this.stagehand as any).context?.pages?.();
    if (!pages || pages.length === 0) {
      return false;
    }

    const afterScreenshotPath = await evidence.captureScreenshot(pages[0], 'After action');
    this.screenshotPaths.push(afterScreenshotPath);

    // Detect state change
    const stateChange = this.stateDetector.compareScreenshots(beforeScreenshot, afterScreenshotPath);

    if (stateChange.changed) {
      console.log(
        `✓ State changed detected (confidence: ${stateChange.confidence}%): ${stateChange.description}`
      );
    } else {
      console.log(`ℹ No state change detected: ${stateChange.description}`);
    }

    return stateChange.changed;
  }

  /**
   * Get action history
   */
  getActionHistory(): Action[] {
    return this.actionHistory;
  }

  /**
   * Get screenshot paths
   */
  getScreenshotPaths(): string[] {
    return this.screenshotPaths;
  }

  /**
   * Reset interactor state
   */
  reset(): void {
    this.actionHistory = [];
    this.currentActionIndex = 0;
    this.failedActions.clear();
    this.screenshotPaths = [];
  }

  /**
   * Get default action set when analysis fails
   */
  private getDefaultActionSet(): Action[] {
    return [
      { type: 'key', value: 'Space', timestamp: Date.now() },
      { type: 'key', value: 'Enter', timestamp: Date.now() },
      { type: 'key', value: 'ArrowUp', timestamp: Date.now() },
      { type: 'key', value: 'ArrowDown', timestamp: Date.now() },
      { type: 'key', value: 'ArrowLeft', timestamp: Date.now() },
      { type: 'key', value: 'ArrowRight', timestamp: Date.now() },
      { type: 'key', value: 'w', timestamp: Date.now() },
      { type: 'key', value: 'a', timestamp: Date.now() },
      { type: 'key', value: 's', timestamp: Date.now() },
      { type: 'key', value: 'd', timestamp: Date.now() },
      { type: 'wait', duration: 1000, timestamp: Date.now() },
    ];
  }
}
