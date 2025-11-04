/**
 * Action Set Builder Module
 *
 * Builds a prioritized list of actions based on game analysis.
 * Creates variations of actions for retry logic (e.g., arrow keys, wasd, etc.)
 */

import type { Action } from '../shared/types.js';
import type { GameAnalysis } from './game-analyzer.js';

/**
 * Action set builder for intelligent action generation
 */
export class ActionSetBuilder {
  /**
   * Build action set from game analysis
   * Prioritizes actions based on what we learned about the game
   *
   * @param analysis - Game analysis from GameAnalyzer
   * @returns Prioritized list of actions to try
   */
  buildActionSet(analysis: GameAnalysis): Action[] {
    // Use simplified action set for better Wordle support
    return this.buildSimplifiedActionSet(analysis);
  }

  /**
   * Build a simplified action set optimized for direct keyboard input
   * Uses only: Arrow keys, WASD, Space, Enter, Backspace, Esc
   * This approach is more reliable for games like Wordle
   *
   * @param analysis - Game analysis from GameAnalyzer
   * @returns Prioritized list of simplified actions
   */
  private buildSimplifiedActionSet(analysis: GameAnalysis): Action[] {
    const actions: Action[] = [];

    console.log(`🎯 Building simplified action set for: ${analysis.gameName}`);
    console.log(`   Using: Arrow keys, WASD, Space, Enter, Backspace, Escape`);

    // Priority 0: Close modals first if present
    if (analysis.hasModal) {
      console.log(`   → Will close modal/dialog first`);
      actions.push({
        type: 'click',
        target: 'modal:close', // Special target for modal close buttons
        value: 'Close modal',
        timestamp: Date.now(),
      });
    }

    // Priority 1: Execute the start action (determined by game analysis)
    if (analysis.startAction === 'button' && !analysis.hasModal) {
      // Click the specific button identified in analysis (but not if we're closing a modal)
      // Only click if it's explicitly a "Play" or "Start" type button
      if (analysis.startActionLabel && (
        analysis.startActionLabel.toLowerCase().includes('play') ||
        analysis.startActionLabel.toLowerCase().includes('start') ||
        analysis.startActionLabel.toLowerCase().includes('begin')
      )) {
        console.log(`   → Will click button labeled: "${analysis.startActionLabel}"`);
        actions.push({
          type: 'click',
          target: `button:contains("${analysis.startActionLabel}")`, // Target specific button by label
          value: `Click ${analysis.startActionLabel}`,
          timestamp: Date.now(),
        });
      }
      // Otherwise, don't click - the game is likely auto-playable
    }

    // Priority 2: Simplified action set - only core keys
    // Space/Enter for start
    actions.push({
      type: 'key',
      value: 'Space',
      timestamp: Date.now(),
    });
    actions.push({
      type: 'key',
      value: 'Enter',
      timestamp: Date.now(),
    });

    // Arrow keys for navigation (all games that use arrows should support all 4)
    actions.push({ type: 'key', value: 'ArrowUp', timestamp: Date.now() });
    actions.push({ type: 'key', value: 'ArrowDown', timestamp: Date.now() });
    actions.push({ type: 'key', value: 'ArrowLeft', timestamp: Date.now() });
    actions.push({ type: 'key', value: 'ArrowRight', timestamp: Date.now() });

    // WASD for alternative navigation
    actions.push({ type: 'key', value: 'w', timestamp: Date.now() });
    actions.push({ type: 'key', value: 'a', timestamp: Date.now() });
    actions.push({ type: 'key', value: 's', timestamp: Date.now() });
    actions.push({ type: 'key', value: 'd', timestamp: Date.now() });

    // Function keys
    actions.push({ type: 'key', value: 'Escape', timestamp: Date.now() });
    actions.push({ type: 'key', value: 'Backspace', timestamp: Date.now() });

    // Wait for game to settle
    actions.push({
      type: 'wait',
      duration: 1000,
      timestamp: Date.now(),
    });

    console.log(`✓ Generated ${actions.length} actions (simplified set)`);
    return actions;
  }

  /**
   * Get start/begin keys (Space, Enter, Escape, etc.)
   */
  private getStartKeys(analysis: GameAnalysis): string[] {
    const startKeys: string[] = [];
    const keys = analysis.keyboardKeys.map((k) => k.toLowerCase());

    // Check what's available
    if (keys.includes('space')) startKeys.push('Space');
    if (keys.includes('enter')) startKeys.push('Enter');
    if (keys.includes('escape')) startKeys.push('Escape');

    // Fallback: try common start keys anyway
    if (startKeys.length === 0) {
      startKeys.push('Space', 'Enter');
    }

    return startKeys;
  }

  /**
   * Get movement keys (arrows, wasd, etc.)
   */
  private getMovementKeys(analysis: GameAnalysis): string[] {
    const movementKeys: string[] = [];
    const keys = analysis.keyboardKeys;

    // Arrow keys
    if (keys.some((k) => k.toLowerCase().startsWith('arrow'))) {
      movementKeys.push('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
    }

    // WASD
    if (
      keys.some((k) => ['w', 'a', 's', 'd'].includes(k.toLowerCase()))
    ) {
      movementKeys.push('w', 'a', 's', 'd');
    }

    // Fallback: try arrows if nothing else
    if (movementKeys.length === 0) {
      movementKeys.push('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
    }

    return movementKeys;
  }

  /**
   * Get action keys (Space, z, x, etc. for jumping, firing, etc.)
   */
  private getActionKeys(analysis: GameAnalysis): string[] {
    const actionKeys: string[] = [];
    const keys = analysis.keyboardKeys;

    // Common action keys
    const commonActions = ['Space', 'z', 'x', 'c', 'Enter', 'Control'];
    for (const key of commonActions) {
      if (keys.some((k) => k.toLowerCase() === key.toLowerCase())) {
        actionKeys.push(key);
      }
    }

    // If we found space keys, add them
    if (keys.includes('Space')) {
      actionKeys.push('Space');
    }

    // Fallback
    if (actionKeys.length === 0) {
      actionKeys.push('Space', 'z', 'x');
    }

    return actionKeys;
  }

  /**
   * Create action variations for retry logic
   * Takes a failed action and generates alternatives to try
   *
   * @param action - Action that failed
   * @param analysis - Game analysis for context
   * @returns Array of alternative actions to try
   */
  createActionVariations(action: Action, analysis: GameAnalysis): Action[] {
    const variations: Action[] = [];

    if (action.type === 'key') {
      // If arrow key failed, try WASD
      if (action.value?.startsWith('Arrow')) {
        const wasdMap: Record<string, string> = {
          ArrowUp: 'w',
          ArrowDown: 's',
          ArrowLeft: 'a',
          ArrowRight: 'd',
        };
        const wasdKey = wasdMap[action.value];
        if (wasdKey) {
          variations.push({
            ...action,
            value: wasdKey,
            timestamp: Date.now(),
          });
        }
      }

      // If WASD failed, try arrows
      if (['w', 'a', 's', 'd'].includes(action.value?.toLowerCase() || '')) {
        const arrowMap: Record<string, string> = {
          w: 'ArrowUp',
          a: 'ArrowLeft',
          s: 'ArrowDown',
          d: 'ArrowRight',
        };
        const arrowKey = arrowMap[action.value?.toLowerCase() || ''];
        if (arrowKey) {
          variations.push({
            ...action,
            value: arrowKey,
            timestamp: Date.now(),
          });
        }
      }

      // If space failed, try enter
      if (action.value === 'Space') {
        variations.push({
          ...action,
          value: 'Enter',
          timestamp: Date.now(),
        });
      }

      // If enter failed, try space
      if (action.value === 'Enter') {
        variations.push({
          ...action,
          value: 'Space',
          timestamp: Date.now(),
        });
      }
    }

    if (action.type === 'click') {
      // If clicking center failed, try clicking buttons
      if (action.target?.includes('center')) {
        variations.push({
          type: 'click',
          target: 'button',
          value: 'Click button',
          timestamp: Date.now(),
        });
      }
    }

    // Add a wait as a safe action
    if (variations.length > 0) {
      variations.push({
        type: 'wait',
        duration: 1500,
        timestamp: Date.now(),
      });
    }

    return variations;
  }
}
