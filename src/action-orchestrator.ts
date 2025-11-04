/**
 * Action Orchestrator Module
 *
 * Coordinates the observe → act → wait → observe cycle for autonomous game interaction.
 * Uses Stagehand V3 capabilities to detect interactive elements and execute actions.
 */

import { Stagehand } from '@browserbasehq/stagehand';
import type { Action, PageState, ActionResult } from './types.js';

/**
 * Orchestrates autonomous interaction with game pages using Stagehand V3
 */
export class ActionOrchestrator {
  private stagehand: Stagehand | null = null;
  private actionHistory: Action[] = [];
  private stateHistory: PageState[] = [];
  private readonly maxActionsPerTest: number;
  private readonly observeTimeoutMs: number;
  private readonly actTimeoutMs: number;
  private isCanvasGame: boolean | null = null;

  constructor(
    maxActionsPerTest: number = 10,
    observeTimeoutMs: number = 5000,
    actTimeoutMs: number = 3000
  ) {
    this.maxActionsPerTest = maxActionsPerTest;
    this.observeTimeoutMs = observeTimeoutMs;
    this.actTimeoutMs = actTimeoutMs;
  }

  /**
   * Set the Stagehand instance to orchestrate
   *
   * @param stagehand - Stagehand V3 instance
   */
  setPage(stagehand: Stagehand): void {
    this.stagehand = stagehand;
  }

  /**
   * Get the current Stagehand instance
   *
   * @returns Current Stagehand instance or null
   */
  getPage(): Stagehand | null {
    return this.stagehand;
  }

  /**
   * Detect if the page is a canvas-based game
   * Canvas games need different interaction strategies
   *
   * @returns true if canvas game detected
   */
  async detectCanvasGame(): Promise<boolean> {
    if (this.isCanvasGame !== null) {
      return this.isCanvasGame;
    }

    if (!this.stagehand) {
      return false;
    }

    try {
      const hasCanvas = await this.stagehand.page.evaluate(() => {
        return document.querySelectorAll('canvas').length > 0;
      });

      if (hasCanvas) {
        console.log('🎮 Detected canvas-based game - may need special handling');
        this.isCanvasGame = true;
        return true;
      }

      this.isCanvasGame = false;
      return false;
    } catch (error) {
      console.warn(`⚠ Canvas detection failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Observe the current page state and detect interactive elements
   *
   * @returns Array of observable actions
   */
  async observe(): Promise<Action[]> {
    if (!this.stagehand) {
      throw new Error('No Stagehand instance set. Call setPage() first.');
    }

    try {
      console.log('👁️  Observing page for interactive elements...');

      // Use Stagehand V3's observe() to detect interactive elements
      const observations = await this.stagehand.observe({
        instruction: 'Find all interactive game controls, buttons, menus, and input fields. Return a list of actionable elements.',
      });

      // Convert observations to actions
      const actions: Action[] = observations.map((obs, idx) => ({
        type: 'click',
        target: obs.domId || `element-${idx}`,
        value: obs.text || `Button ${idx}`,
        timestamp: Date.now(),
      }));

      console.log(`✓ Found ${actions.length} interactive elements`);

      // Store current page state
      await this.recordPageState();

      return actions;
    } catch (error) {
      // Observation failures are common, especially with canvas games or DOM changes
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠ Observation failed (normal after DOM changes): ${errorMsg.substring(0, 100)}`);
      return [];
    }
  }

  /**
   * Execute an action on the page
   *
   * @param action - Action to execute
   * @returns Result of action execution
   */
  async executeAction(action: Action): Promise<ActionResult> {
    if (!this.stagehand) {
      throw new Error('No Stagehand instance set. Call setPage() first.');
    }

    const startTime = Date.now();

    try {
      console.log(`🎯 Executing action: ${action.type} on ${action.target || 'page'}`);

      let success = false;

      switch (action.type) {
        case 'click': {
          try {
            // Use Stagehand V3's act() to click elements
            const result = await this.stagehand.act({
              action: `Click on element: ${action.value}`,
            });
            success = result?.success ?? false;
            console.log(success ? `✓ Click executed` : `⚠ Click may not have worked`);
          } catch (actError) {
            console.warn(`⚠ Click action error: ${actError instanceof Error ? actError.message : String(actError)}`);
            success = false;
          }
          break;
        }

        case 'type': {
          if (!action.value) {
            throw new Error('Type action requires a value');
          }

          try {
            const result = await this.stagehand.act({
              action: `Type the text: "${action.value}"`,
            });
            success = result?.success ?? false;
            console.log(success ? `✓ Type executed` : `⚠ Type may not have worked`);
          } catch (actError) {
            console.warn(`⚠ Type action error: ${actError instanceof Error ? actError.message : String(actError)}`);
            success = false;
          }
          break;
        }

        case 'key': {
          if (!action.value) {
            throw new Error('Key action requires a value');
          }

          try {
            const result = await this.stagehand.act({
              action: `Press the ${action.value} key`,
            });
            success = result?.success ?? false;
            console.log(success ? `✓ Key press executed` : `⚠ Key press may not have worked`);
          } catch (actError) {
            console.warn(`⚠ Key action error: ${actError instanceof Error ? actError.message : String(actError)}`);
            success = false;
          }
          break;
        }

        case 'wait': {
          const duration = action.duration || 1000;
          console.log(`⏳ Waiting ${duration}ms for page to settle...`);
          await new Promise((resolve) => setTimeout(resolve, duration));
          success = true;
          break;
        }

        default: {
          throw new Error(`Unknown action type: ${action.type}`);
        }
      }

      // Record page state after action
      await this.recordPageState();

      const result: ActionResult = {
        success,
        executedAt: Date.now(),
        duration: Date.now() - startTime,
      };

      action.result = result;
      this.actionHistory.push(action);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠ Action execution error: ${errorMsg}`);

      const result: ActionResult = {
        success: false,
        error: errorMsg,
        executedAt: Date.now(),
        duration: Date.now() - startTime,
      };

      action.result = result;
      this.actionHistory.push(action);

      return result;
    }
  }

  /**
   * Execute the observe → act → wait → observe cycle
   *
   * @returns Actions taken during this cycle
   */
  async executeCycle(): Promise<Action[]> {
    if (this.actionHistory.length >= this.maxActionsPerTest) {
      console.log(`⚠ Max actions reached (${this.maxActionsPerTest})`);
      return [];
    }

    const cycleActions: Action[] = [];

    try {
      // Step 1: Observe
      const observedActions = await this.observe();

      if (observedActions.length === 0) {
        console.log('ℹ No interactive elements found');
        // Try waiting a bit and observing again
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const retryObservations = await this.observe();

        if (retryObservations.length === 0) {
          console.log('ℹ Still no elements after retry');
          return cycleActions;
        }

        // Use retry observations
        const actionToTake = retryObservations[0];
        await this.executeAction(actionToTake);
        cycleActions.push(actionToTake);
      } else {
        // Step 2: Act on first observable element
        const actionToTake = observedActions[0];
        await this.executeAction(actionToTake);
        cycleActions.push(actionToTake);
      }

      // Step 3: Wait for page to settle
      await this.executeAction({
        type: 'wait',
        duration: 1500,
        timestamp: Date.now(),
      });

      // Step 4: Observe new state
      const newObservations = await this.observe();
      cycleActions.push(...newObservations);

      return cycleActions;
    } catch (error) {
      console.warn(
        `⚠ Error during cycle: ${error instanceof Error ? error.message : String(error)}`
      );
      return cycleActions;
    }
  }

  /**
   * Execute multiple cycles for deeper interaction
   *
   * @param cycles - Number of cycles to execute
   * @returns All actions executed
   */
  async executeMultipleCycles(cycles: number): Promise<Action[]> {
    const allActions: Action[] = [];

    for (let i = 0; i < cycles; i++) {
      console.log(`\n📍 Cycle ${i + 1}/${cycles}`);

      const cycleActions = await this.executeCycle();
      allActions.push(...cycleActions);

      if (cycleActions.length === 0) {
        console.log('No more actions available, stopping cycles');
        break;
      }
    }

    return allActions;
  }

  /**
   * Record current page state for change detection
   */
  private async recordPageState(): Promise<void> {
    if (!this.stagehand) return;

    try {
      const url = this.stagehand.page.url();
      const title = await this.stagehand.page.title();

      const state: PageState = {
        url,
        title,
        timestamp: Date.now(),
        hash: this.generateStateHash(url + title),
      };

      this.stateHistory.push(state);
    } catch (error) {
      console.warn(`Failed to record page state: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate a hash of page state for change detection
   *
   * @param content - Content to hash
   * @returns Simple hash string
   */
  private generateStateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Detect if page state has changed since last observation
   *
   * @returns true if state changed, false otherwise
   */
  hasPageChanged(): boolean {
    if (this.stateHistory.length < 2) return false;

    const current = this.stateHistory[this.stateHistory.length - 1];
    const previous = this.stateHistory[this.stateHistory.length - 2];

    return current.hash !== previous.hash;
  }

  /**
   * Get action history
   *
   * @returns All actions executed
   */
  getActionHistory(): Action[] {
    return this.actionHistory;
  }

  /**
   * Get page state history
   *
   * @returns All recorded page states
   */
  getStateHistory(): PageState[] {
    return this.stateHistory;
  }

  /**
   * Reset action and state history
   */
  reset(): void {
    this.actionHistory = [];
    this.stateHistory = [];
    console.log('✓ Action and state history cleared');
  }
}
