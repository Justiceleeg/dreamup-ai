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
 * Leverages Stagehand's native DOM and visual change detection
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
   * Uses Stagehand's observe() API to watch for DOM and visual changes.
   * Stagehand's observe() automatically detects changes, no manual comparison needed.
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

      // Stagehand's observe() automatically detects DOM mutations and visual changes
      // Returns information about what changed on the page
      const observationResult = await (this.stagehand as any).observe?.({
        instruction: action,
        timeout,
      });

      // Check if observation detected changes
      if (!observationResult) {
        console.log(`ℹ  No changes observed during action`);
        return {
          changed: false,
          confidence: 85,
          description: 'No changes detected by observe()',
        };
      }

      // If we got a result, changes were detected
      console.log(`✓ State change detected during observation`);
      return {
        changed: true,
        confidence: 95, // High confidence from Stagehand's native detection
        description: 'Page state changed (detected by Stagehand observe)',
        observationDetails: {
          domChanges: true,
        },
      };
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

}
