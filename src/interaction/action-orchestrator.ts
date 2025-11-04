/**
 * Action Orchestrator Module
 *
 * Coordinates the observe → act → wait → observe cycle for autonomous game interaction.
 * Uses Stagehand V3 capabilities to detect interactive elements and execute actions.
 */

import { Stagehand } from '@browserbasehq/stagehand';
import type { Action, PageState, ActionResult } from '../shared/types.js';

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
      // In Stagehand V3, access page via context.pages()
      const pages = (this.stagehand as any).context?.pages?.();
      if (!pages || pages.length === 0) return false;

      const page = pages[0];
      const hasCanvas = await page.evaluate(() => {
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

      // Check if this is a canvas game first
      const isCanvasGame = await this.detectCanvasGame();

      if (isCanvasGame) {
        // For canvas games, use canvas-specific observation
        console.log('🎮 Canvas game detected - using canvas-aware observation...');
        const canvasActions = await this.observeCanvasGame();

        if (canvasActions.length > 0) {
          console.log(`✓ Found ${canvasActions.length} canvas interactive element(s)`);
          await this.recordPageState();
          return canvasActions;
        }

        console.log('ℹ No canvas interactive elements identified');
      }

      // Use Stagehand V3's observe() to detect DOM interactive elements
      // observe() can be called with just a string instruction or with options
      const observations = await this.stagehand.observe(
        'Find all interactive game controls, buttons, menus, and input fields. Return a list of actionable elements.'
      );

      // Convert observations to actions
      // observations is an array of Action objects from Stagehand
      const actions: Action[] = observations.map((obs: any, idx: number) => ({
        type: 'click',
        target: obs.selector || obs.domId || `element-${idx}`,
        value: obs.description || obs.text || `Button ${idx}`,
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
            // Check if this is a canvas coordinate-based click (target format: "canvas:x,y")
            if (action.target?.startsWith('canvas:')) {
              const coords = action.target.substring('canvas:'.length).split(',');
              const x = parseInt(coords[0], 10);
              const y = parseInt(coords[1], 10);

              if (!isNaN(x) && !isNaN(y)) {
                console.log(`🎮 Clicking canvas at coordinates (${x}, ${y})`);
                const clickSuccess = await this.clickCanvasAt(x, y);
                success = clickSuccess;
              } else {
                console.warn(`⚠ Invalid canvas coordinates: ${action.target}`);
                success = false;
              }
            } else {
              // Use Stagehand V3's act() with simple string instruction for DOM elements
              const result = await this.stagehand.act(`Click on element: ${action.value}`);
              success = result?.success ?? true; // act() returns ActResult, assume success if no error
              console.log(`✓ Click executed`);
            }
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
            // Use Stagehand V3's act() with simple string instruction
            const result = await this.stagehand.act(`Type the text: "${action.value}"`);
            success = result?.success ?? true;
            console.log(`✓ Type executed`);
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
            // Use Stagehand V3's act() with simple string instruction
            const result = await this.stagehand.act(`Press the ${action.value} key`);
            success = result?.success ?? true;
            console.log(`✓ Key press executed`);
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
      // In Stagehand V3, access page via context.pages()
      const pages = (this.stagehand as any).context?.pages?.();
      if (!pages || pages.length === 0) return;

      const page = pages[0];
      const url = page.url();
      const title = await page.title();

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

  /**
   * Handle canvas game interaction by identifying canvas and its center
   * For games like Pac-Man where UI is rendered on canvas
   *
   * @returns Actions identified on canvas, or empty array if none found
   */
  async observeCanvasGame(): Promise<Action[]> {
    if (!this.stagehand) {
      return [];
    }

    try {
      console.log('🎮 Attempting canvas game observation...');

      // Get the underlying Playwright page object
      const pages = (this.stagehand as any).context?.pages?.();
      if (!pages || pages.length === 0) {
        console.warn('⚠ No pages available');
        return [];
      }

      const page = pages[0];

      // Use evaluate to find canvas and get its position from the browser
      const canvasInfo = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
        };
      });

      if (!canvasInfo) {
        console.warn('⚠ Canvas not found on page');
        return [];
      }

      console.log(`📐 Canvas found: width=${canvasInfo.width}, height=${canvasInfo.height}`);
      console.log(`🎯 Canvas center at: x=${canvasInfo.x}, y=${canvasInfo.y}`);

      // Return an action to click the canvas center
      // where the "PRESS START" button typically is
      return [{
        type: 'click',
        target: `canvas:${Math.round(canvasInfo.x)},${Math.round(canvasInfo.y)}`,
        value: 'Canvas START button',
        timestamp: Date.now(),
      }];
    } catch (error) {
      console.warn(`⚠ Canvas observation failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Click on canvas at specific coordinates using Stagehand's act()
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Success status
   */
  async clickCanvasAt(x: number, y: number): Promise<boolean> {
    if (!this.stagehand) {
      return false;
    }

    try {
      // Use Stagehand's act() to perform the click action
      // This works with the canvas by using natural language combined with coordinates
      const result = await this.stagehand.act(
        `Click on the canvas at coordinates approximately (${Math.round(x)}, ${Math.round(y)}), which appears to be the center of the game area`
      );

      console.log(`✓ Stagehand executed canvas click at (${x}, ${y})`);
      return result?.success ?? true;
    } catch (error) {
      console.warn(`⚠ Canvas click via act() failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}
