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
import { GameStateAnalyzer } from '../game-analysis/game-state-analyzer.js';
import { ActionSetBuilder } from '../game-analysis/action-set-builder.js';
import { StateChangeDetector } from '../detection/state-change-detector.js';
import { EvidenceCapture } from '../evidence/evidence-capture.js';

/**
 * Improved game interactor with intelligent action selection and retry logic
 */
export class ImprovedGameInteractor {
  private stagehand: Stagehand | null = null;
  private playwrightPage: any = null; // Store the actual Playwright page directly
  private gameAnalyzer: GameAnalyzer;
  private gameStateAnalyzer: GameStateAnalyzer;
  private actionSetBuilder: ActionSetBuilder;
  private stateDetector: StateChangeDetector;
  private actionHistory: Action[] = [];
  private currentActionSet: Action[] = [];
  private currentActionIndex: number = 0;
  private failedActions: Map<string, number> = new Map(); // Track failures for retry logic
  private screenshotPaths: string[] = [];
  private intermediateScreenshotCount: number = 0; // Track intermediate screenshots (max 3)
  private captureIntermediateScreenshots: boolean = true; // Configurable based on screenshotCount
  private analyzeBeforeAction: boolean = true; // Whether to analyze state before each action
  private gameReanalyzed: boolean = false; // Track if we've already re-analyzed the game
  private successfulActions: number = 0; // Track actions that caused state changes
  private maxSuccessfulActions: number = 2; // Stop after 2 successful actions

  constructor(analyzeBeforeAction: boolean = true) {
    this.gameAnalyzer = new GameAnalyzer();
    this.gameStateAnalyzer = new GameStateAnalyzer();
    this.actionSetBuilder = new ActionSetBuilder();
    this.stateDetector = new StateChangeDetector();
    this.analyzeBeforeAction = analyzeBeforeAction;
    this.successfulActions = 0;
  }

  /**
   * Configure screenshot capture strategy
   * @param captureIntermediates - Whether to capture intermediate screenshots (true if screenshotCount >= 3)
   */
  setScreenshotStrategy(captureIntermediates: boolean): void {
    this.captureIntermediateScreenshots = captureIntermediates;
  }

  /**
   * Set the Stagehand instance AND the actual Playwright page
   * @param stagehand - Stagehand instance (for legacy compatibility)
   * @param playwrightPage - The actual Playwright page object to use for direct keyboard input
   */
  setPage(stagehand: Stagehand, playwrightPage?: any): void {
    this.stagehand = stagehand;
    if (playwrightPage) {
      this.playwrightPage = playwrightPage;
    }
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
    this.intermediateScreenshotCount = 0; // Reset intermediate counter
    this.gameReanalyzed = false; // Reset re-analysis flag
  }

  /**
   * Capture final screenshot after all interactions
   * Should be called after the action loop completes
   *
   * @param evidence - EvidenceCapture instance for screenshots
   */
  async captureFinalScreenshot(evidence: EvidenceCapture): Promise<void> {
    try {
      const pages = (this.stagehand as any).context?.pages?.();
      if (!pages || pages.length === 0) {
        console.warn('⚠ Could not capture final screenshot - no pages available');
        return;
      }

      const finalScreenshotPath = await evidence.captureScreenshot(pages[0], 'Final state');
      this.screenshotPaths.push(finalScreenshotPath);
      console.log(`✓ Final screenshot captured`);
    } catch (error) {
      console.warn(
        `⚠ Could not capture final screenshot: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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

    // Analyze game state before taking action (if enabled)
    if (this.analyzeBeforeAction && this.screenshotPaths.length > 0) {
      try {
        const lastScreenshot = this.screenshotPaths[this.screenshotPaths.length - 1];
        console.log(`🔍 Analyzing game state before action...`);
        const gameState = await this.gameStateAnalyzer.analyzeGameState(lastScreenshot);

        // If gameplay is blocked, try to unblock it
        if (gameState.isBlocked && gameState.blockedBy) {
          console.log(`⚠ Gameplay blocked by: ${gameState.blockedBy}`);
          if (gameState.recommendedAction === 'close_modal' || gameState.recommendedAction === 'dismiss_dialog') {
            console.log(`   Attempting to dismiss blocking UI...`);
            try {
              const pages = (this.stagehand as any).context?.pages?.();
              if (pages && pages.length > 0) {
                await this.executeAction({
                  type: 'click',
                  target: 'modal:close',
                  value: 'Close/dismiss blocking UI',
                  timestamp: Date.now(),
                });
                console.log(`✓ Blocking UI dismissed`);
                // Small wait for UI to settle
                await new Promise((resolve) => setTimeout(resolve, 500));
                return { success: true, executedAt: Date.now(), duration: 500 };
              }
            } catch (dismissError) {
              console.warn(`⚠ Failed to dismiss blocking UI: ${dismissError}`);
              // Continue with normal action
            }
          }
        }

        // Log game state info
        console.log(`   Game ready: ${gameState.gameplayReady}, Available controls: ${gameState.availableControls.join(', ')}`);
      } catch (analysisError) {
        // Analysis failed, continue with normal action
        console.log(`   State analysis skipped: ${analysisError}`);
      }
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
   * Execute action with Stagehand/Playwright
   * Uses direct keyboard/click actions instead of AI-powered act()
   */
  private async executeAction(action: Action): Promise<ActionResult> {
    if (!this.stagehand) {
      throw new Error('No Stagehand instance');
    }

    const startTime = Date.now();
    const ACTION_TIMEOUT = 10000; // 10 second max per action

    try {
      // Use the stored Playwright page directly
      if (!this.playwrightPage) {
        throw new Error('No Playwright page available - was setPage() called?');
      }

      switch (action.type) {
        case 'key': {
          const keyToPress = action.value || 'Space';
          console.log(`⌨️  Pressing key: ${keyToPress}`);

          try {
            // Use direct keyboard input for faster, more reliable key presses
            console.log(`  Using Playwright page.keyboard.press() for: ${keyToPress}`);

            // Timeout wrapper for keyboard press
            const keyPromise = this.playwrightPage.keyboard.press(keyToPress);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Key press timeout after ${ACTION_TIMEOUT}ms`)), ACTION_TIMEOUT)
            );

            await Promise.race([keyPromise, timeoutPromise]);
            console.log(`✓ Keyboard action executed: ${keyToPress}`);

            // Add delay for key press to register
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (keyError) {
            console.error(`❌ Keyboard action failed for ${keyToPress}: ${keyError}`);
            // Continue instead of throwing - allow system to try next action
            // This prevents one failed key from stopping all interactions
            console.log(`   Continuing with next action...`);
          }
          break;
        }

        case 'click': {
          const target = action.target || 'body';
          console.log(`🖱️  Clicking: ${action.value || target}`);

          try {
            // If target contains "contains(", use text matching
            if (target.includes('contains(')) {
              console.log(`  Using text-matching click...`);
              // Extract the text from button:contains("text")
              const match = target.match(/contains\("([^"]+)"\)/);
              if (match) {
                const buttonText = match[1];
                console.log(`  Finding button with text: "${buttonText}"`);

                // Use JavaScript to find and click the button by text content
                const clicked = await this.playwrightPage.evaluate((text) => {
                  const buttons = document.querySelectorAll('button, [role="button"]');
                  for (const btn of buttons) {
                    if (btn.textContent && btn.textContent.trim().includes(text)) {
                      (btn as HTMLElement).click();
                      return true;
                    }
                  }
                  return false;
                }, buttonText);

                if (clicked) {
                  console.log(`✓ Clicked button with text "${buttonText}"`);
                } else {
                  throw new Error(`Button with text "${buttonText}" not found`);
                }
              }
            } else if (target === 'modal:close') {
              console.log(`  Attempting to close modal...`);
              // Use JavaScript to find and click the modal close button
              const closed = await this.playwrightPage.evaluate(() => {
                // Look for modal/dialog close buttons - check aria-label first (most reliable)
                let closeBtn = document.querySelector('button[aria-label="Close"]');
                if (closeBtn) {
                  console.log('Found button with aria-label="Close"');
                  (closeBtn as HTMLElement).click();
                  return true;
                }

                // Look for buttons with aria-label containing "close" (case-insensitive)
                const allButtons = document.querySelectorAll('button');
                for (const btn of allButtons) {
                  const ariaLabel = btn.getAttribute('aria-label') || '';
                  if (ariaLabel.toLowerCase().includes('close')) {
                    console.log(`Found close button with aria-label="${ariaLabel}"`);
                    (btn as HTMLElement).click();
                    return true;
                  }
                }

                // Look for dialogs/modals and find close buttons inside them
                const dialogs = document.querySelectorAll('[role="dialog"], [aria-modal="true"], .modal, .popup');
                for (const dialog of dialogs) {
                  const buttons = dialog.querySelectorAll('button');
                  for (const btn of buttons) {
                    const text = btn.textContent?.trim().toLowerCase() || '';
                    const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';

                    // Check for close/dismiss/X symbols
                    if (text === 'close' || text === 'dismiss' || text === '✕' || text === '×' ||
                        ariaLabel.includes('close') || ariaLabel.includes('dismiss')) {
                      console.log(`Found close button in dialog: "${text || ariaLabel}"`);
                      (btn as HTMLElement).click();
                      return true;
                    }
                  }
                }

                return false;
              });

              if (closed) {
                console.log(`✓ Closed modal`);
              } else {
                console.error('Modal close button not found');
                // Don't throw - allow continuing with next action
              }
            } else if (target === 'button') {
              console.log(`  Attempting to click button element...`);
              try {
                await this.playwrightPage.click('button:visible', { timeout: 1000 });
                console.log(`✓ Clicked button element`);
              } catch (buttonError) {
                console.log(`  Button not found, trying [role="button"]...`);
                // Fallback: try role=button
                try {
                  await this.playwrightPage.click('[role="button"]', { timeout: 1000 });
                  console.log(`✓ Clicked [role="button"] element`);
                } catch (roleButtonError) {
                  console.log(`  No clickable buttons found`);
                  // Don't throw - allow continuing
                }
              }
            } else if (target === 'canvas:center') {
              // Click center of page (for canvas-based games)
              const viewportSize = this.playwrightPage.viewportSize();
              if (viewportSize) {
                const centerX = viewportSize.width / 2;
                const centerY = viewportSize.height / 2;
                console.log(`  Clicking viewport center (${centerX}, ${centerY})`);
                await this.playwrightPage.click('body', { position: { x: centerX, y: centerY } });
                console.log(`✓ Clicked viewport center`);
              } else {
                console.log(`  No viewport size, clicking body center`);
                await this.playwrightPage.click('body');
              }
            } else {
              // Custom selector
              console.log(`  Clicking selector: ${target}`);
              await this.playwrightPage.click(target);
              console.log(`✓ Clicked: ${target}`);
            }
          } catch (clickError) {
            console.error(`❌ Click action failed: ${clickError}`);
            console.log(`   Continuing with next action...`);
          }
          break;
        }

        case 'wait': {
          const duration = action.duration || 1000;
          console.log(`⏳ Waiting ${duration}ms`);
          await new Promise((resolve) => setTimeout(resolve, duration));
          break;
        }

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      return {
        success: true,
        executedAt: Date.now(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`❌ Action execution failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(
        `Failed to execute ${action.type} action: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute interaction cycle with state change detection
   * Only captures screenshot if state changed and within intermediate limit
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

    // After modal has been closed and game is truly ready, re-analyze
    // This helps detect actual gameplay controls that weren't visible on splash screen
    // Check if there's a modal - if not, and we're early in the game, re-analyze
    const pages = (this.stagehand as any).context?.pages?.();
    if (pages && pages.length > 0) {
      const hasModal = await pages[0].evaluate(() => {
        return !!document.querySelector('[role="dialog"], [aria-modal="true"], .modal, .popup');
      });

      // For games with startup modals (like Wordle), do a quick re-analysis after modal dismissal
      // to detect actual gameplay controls that weren't visible on splash screen
      // Only do this once and only if we found modal instructions
      if (!hasModal && this.currentActionIndex <= 2 && !this.gameReanalyzed) {
        const modalContent = this.gameStateAnalyzer.getModalContent();
        if (modalContent) {
          try {
            const screenshotPaths = evidence.getScreenshotPaths();
            if (screenshotPaths.length > 0) {
              const lastScreenshot = screenshotPaths[screenshotPaths.length - 1];
              console.log(`🔄 Quick re-analysis using modal instructions...`);
              const updatedAnalysis = await this.gameAnalyzer.analyzeGameFromInstructions(modalContent, lastScreenshot);

              if (updatedAnalysis.keyboardKeys && updatedAnalysis.keyboardKeys.length > 0) {
                console.log(`✓ Found controls from instructions: ${updatedAnalysis.keyboardKeys.join(', ')}`);
                const newActionSet = this.actionSetBuilder.buildActionSet(updatedAnalysis);
                if (newActionSet.length > this.currentActionSet.length) {
                  console.log(`⬆️  Action set updated: ${this.currentActionSet.length} → ${newActionSet.length} actions`);
                  this.currentActionSet = newActionSet;
                  this.currentActionIndex = 1; // Start from action 1 (skip modal close/startup)
                }
              }
              this.gameReanalyzed = true;
            }
          } catch (reanalysisError) {
            console.log(`ℹ Re-analysis skipped: ${reanalysisError}`);
          }
        }
      }
    }

    // Capture after screenshot for comparison
    const pagesForScreenshot = (this.stagehand as any).context?.pages?.();
    if (!pagesForScreenshot || pagesForScreenshot.length === 0) {
      return false;
    }

    const afterScreenshotPath = await evidence.captureScreenshot(pagesForScreenshot[0], 'After action');

    // Check if a modal appeared - if so, close it and consider that a state change
    const modalDetected = await pagesForScreenshot[0].evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"], .modal, .popup');
      return !!modal;
    });

    if (modalDetected) {
      console.log(`ℹ Modal detected, extracting content before closing...`);
      // Extract modal content (instructions, controls info, etc.) before dismissing
      const modalContent = await this.gameStateAnalyzer.extractModalContent(pagesForScreenshot[0]);
      if (modalContent) {
        console.log(`📖 Modal instructions: ${modalContent.substring(0, 150)}...`);
      }

      // Inject a modal-close action
      const closeResult = await this.executeAction({
        type: 'click',
        target: 'modal:close',
        value: 'Close modal',
        timestamp: Date.now(),
      });

      if (closeResult) {
        console.log(`✓ Modal closed successfully`);
        // Small wait for modal animation
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Recapture screenshot after closing modal
        const afterModalScreenshot = await evidence.captureScreenshot(pagesForScreenshot[0], 'After closing modal');
        this.screenshotPaths.push(afterModalScreenshot);
        return true;
      }
    }

    // Detect state change
    const stateChange = this.stateDetector.compareScreenshots(beforeScreenshot, afterScreenshotPath);

    if (stateChange.changed) {
      console.log(
        `✓ State changed detected (confidence: ${stateChange.confidence}%): ${stateChange.description}`
      );

      // Track successful (state-changing) action
      this.successfulActions++;
      console.log(`✅ Successful action #${this.successfulActions}/${this.maxSuccessfulActions}`);

      // Only keep screenshot if we're capturing intermediates and haven't hit the limit
      if (this.captureIntermediateScreenshots && this.intermediateScreenshotCount < 3) {
        this.screenshotPaths.push(afterScreenshotPath);
        this.intermediateScreenshotCount++;
        console.log(
          `  Screenshot captured (intermediate ${this.intermediateScreenshotCount}/3)`
        );
      } else {
        console.log(`  Skipping intermediate screenshot (limit reached or not configured)`);
      }

      // Check if we've reached the goal
      if (this.shouldStop()) {
        console.log(`🎯 Reached goal: ${this.maxSuccessfulActions} successful actions detected!`);
      }
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
   * Check if we should stop interaction (reached max successful actions)
   */
  shouldStop(): boolean {
    return this.successfulActions >= this.maxSuccessfulActions;
  }

  /**
   * Get number of successful actions (state-changing actions)
   */
  getSuccessfulActionCount(): number {
    return this.successfulActions;
  }

  /**
   * Reset interactor state
   */
  reset(): void {
    this.actionHistory = [];
    this.currentActionIndex = 0;
    this.failedActions.clear();
    this.screenshotPaths = [];
    this.successfulActions = 0;
  }

  /**
   * Get default action set when analysis fails
   */
  private getDefaultActionSet(): Action[] {
    return [
      // Click first to focus the game (important for web-based games like Wordle)
      { type: 'click', timestamp: Date.now() },

      // Start/submit keys
      { type: 'key', value: 'Space', timestamp: Date.now() },
      { type: 'key', value: 'Enter', timestamp: Date.now() },

      // Arrow keys (for puzzle games, platformers)
      { type: 'key', value: 'ArrowUp', timestamp: Date.now() },
      { type: 'key', value: 'ArrowDown', timestamp: Date.now() },
      { type: 'key', value: 'ArrowLeft', timestamp: Date.now() },
      { type: 'key', value: 'ArrowRight', timestamp: Date.now() },

      // WASD (alternative movement)
      { type: 'key', value: 'w', timestamp: Date.now() },
      { type: 'key', value: 'a', timestamp: Date.now() },
      { type: 'key', value: 's', timestamp: Date.now() },
      { type: 'key', value: 'd', timestamp: Date.now() },

      // Letter typing (for word games like Wordle)
      // First, some common starting letters
      { type: 'key', value: 's', timestamp: Date.now() },
      { type: 'key', value: 't', timestamp: Date.now() },
      { type: 'key', value: 'a', timestamp: Date.now() },
      { type: 'key', value: 'r', timestamp: Date.now() },
      { type: 'key', value: 'e', timestamp: Date.now() },

      // More vowels and common letters
      { type: 'key', value: 'o', timestamp: Date.now() },
      { type: 'key', value: 'i', timestamp: Date.now() },
      { type: 'key', value: 'n', timestamp: Date.now() },
      { type: 'key', value: 'l', timestamp: Date.now() },
      { type: 'key', value: 'c', timestamp: Date.now() },

      // Function keys
      { type: 'key', value: 'Escape', timestamp: Date.now() },
      { type: 'key', value: 'Backspace', timestamp: Date.now() },

      // Another click in case first one wasn't enough
      { type: 'click', timestamp: Date.now() },

      { type: 'wait', duration: 1000, timestamp: Date.now() },
    ];
  }
}
