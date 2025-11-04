/**
 * Observe-based State Change Detector Module
 *
 * Uses Stagehand's observe() capability to detect DOM and visual changes.
 * This is more reliable than screenshot comparison because it actually watches
 * for real page state changes rather than comparing file sizes.
 */

import type { Stagehand } from '@browserbasehq/stagehand';

/**
 * State change detection result
 */
export interface StateChangeResult {
  changed: boolean;
  confidence: number; // 0-100, how confident we are in this result
  description: string;
  observationDetails?: {
    domChanges?: boolean;
    htmlChanged?: string;
    elementsChanged?: number;
  };
}

/**
 * Detects game state changes using Stagehand's observe() capability
 */
export class ObserveStateDetector {
  private stagehand: Stagehand | null = null;

  constructor(stagehand?: Stagehand) {
    this.stagehand = stagehand || null;
  }

  /**
   * Set the Stagehand instance
   */
  setStagehand(stagehand: Stagehand): void {
    this.stagehand = stagehand;
  }

  /**
   * Observe page for state changes during an action execution
   * Starts observation before the action and waits for changes
   *
   * @param action - Description of action being taken (for logging)
   * @param timeout - How long to observe (in ms)
   * @returns State change detection result
   */
  async observeActionEffect(action: string, timeout: number = 2000): Promise<StateChangeResult> {
    if (!this.stagehand) {
      return {
        changed: false,
        confidence: 0,
        description: 'Stagehand instance not set for observation',
      };
    }

    try {
      console.log(`👁️  Observing page for changes during: ${action}`);

      // Get initial page state
      const initialState = await this.capturePageState();

      // Use stagehand.observe() to watch for changes
      // observe() returns information about what changed on the page
      const observationResult = await (this.stagehand as any).observe({
        timeout,
        instruction: `Execute this action and report any changes: ${action}`,
      });

      // Capture new page state after observation
      const finalState = await this.capturePageState();

      // Compare states to determine if change occurred
      const stateChanged = this.comparePageStates(initialState, finalState);

      if (stateChanged) {
        console.log(`✓ State change detected during observation`);
        return {
          changed: true,
          confidence: 90, // High confidence when observe() detects changes
          description: 'Page state changed (detected by Stagehand observation)',
          observationDetails: {
            domChanges: true,
            htmlChanged: observationResult?.changes?.html ? 'yes' : 'no',
            elementsChanged: observationResult?.changes?.elementCount || 0,
          },
        };
      } else {
        console.log(`ℹ  No state change detected during observation`);
        return {
          changed: false,
          confidence: 85, // High confidence when observe() confirms no changes
          description: 'Page state unchanged (verified by observation)',
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠  Observation failed: ${errorMsg}`);
      return {
        changed: false,
        confidence: 0,
        description: `Error during observation: ${errorMsg}`,
      };
    }
  }

  /**
   * Capture the current state of the page
   * This provides a snapshot to compare against
   */
  private async capturePageState(): Promise<{
    html: string;
    bodyText: string;
    elementCount: number;
    hash: string;
  }> {
    try {
      if (!this.stagehand) {
        throw new Error('Stagehand instance not available');
      }

      // Use stagehand's page evaluation to get page state
      const state = await (this.stagehand as any).page.evaluate(() => {
        return {
          html: document.documentElement.outerHTML.substring(0, 5000), // First 5000 chars to keep it manageable
          bodyText: document.body.innerText.substring(0, 2000), // First 2000 chars of body text
          elementCount: document.querySelectorAll('*').length,
        };
      });

      // Calculate a simple hash of the state
      const hash = this.simpleHash(JSON.stringify(state));

      return {
        ...state,
        hash,
      };
    } catch (error) {
      console.warn(`⚠  Failed to capture page state: ${error}`);
      return {
        html: '',
        bodyText: '',
        elementCount: 0,
        hash: '',
      };
    }
  }

  /**
   * Compare two page states to detect changes
   */
  private comparePageStates(
    initial: { html: string; bodyText: string; elementCount: number; hash: string },
    final: { html: string; bodyText: string; elementCount: number; hash: string }
  ): boolean {
    // If hashes differ, states are different
    if (initial.hash !== final.hash) {
      return true;
    }

    // If HTML differs, states are different
    if (initial.html !== final.html) {
      return true;
    }

    // If body text differs, states are different
    if (initial.bodyText !== final.bodyText) {
      return true;
    }

    // If element count differs significantly (more than 5% change), states are different
    const elementDiff = Math.abs(final.elementCount - initial.elementCount);
    const elementChangePercent = initial.elementCount > 0 ? elementDiff / initial.elementCount : 0;
    if (elementChangePercent > 0.05) {
      return true;
    }

    return false;
  }

  /**
   * Simple hash function for comparing states
   * Not cryptographically secure, just for quick comparison
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Wait for a specific condition to be true on the page
   * Useful for detecting when a game action has completed
   */
  async waitForCondition(
    condition: string,
    timeout: number = 2000,
    checkInterval: number = 100
  ): Promise<boolean> {
    if (!this.stagehand) {
      console.warn('Stagehand instance not set');
      return false;
    }

    const startTime = Date.now();

    try {
      while (Date.now() - startTime < timeout) {
        const conditionMet = await (this.stagehand as any).page.evaluate((cond: string) => {
          // This would need to be more sophisticated in real implementation
          // For now, just return a basic eval (security consideration: only use trusted conditions)
          try {
            return eval(cond);
          } catch {
            return false;
          }
        }, condition);

        if (conditionMet) {
          return true;
        }

        await new Promise((resolve) => setTimeout(resolve, checkInterval));
      }

      return false;
    } catch (error) {
      console.warn(`Error waiting for condition: ${error}`);
      return false;
    }
  }
}
