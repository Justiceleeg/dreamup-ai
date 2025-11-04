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
    const actions: Action[] = [];

    console.log(`🎯 Building action set for: ${analysis.gameName}`);
    console.log(`   Keys: ${analysis.keyboardKeys.join(', ')}`);
    console.log(`   Mouse: ${analysis.mouseActions.join(', ')}`);

    // Priority 1: Try to start the game with common start keys
    const startKeys = this.getStartKeys(analysis);
    for (const key of startKeys) {
      actions.push({
        type: 'key',
        value: key,
        timestamp: Date.now(),
      });
    }

    // Priority 2: Add movement keys
    const movementKeys = this.getMovementKeys(analysis);
    for (const key of movementKeys) {
      actions.push({
        type: 'key',
        value: key,
        timestamp: Date.now(),
      });
    }

    // Priority 3: Add action keys (spacebar, etc.)
    const actionKeys = this.getActionKeys(analysis);
    for (const key of actionKeys) {
      actions.push({
        type: 'key',
        value: key,
        timestamp: Date.now(),
      });
    }

    // Priority 4: Add mouse clicks if supported
    if (analysis.mouseActions.includes('click')) {
      // Click center of game area (common pattern)
      actions.push({
        type: 'click',
        target: 'canvas:center', // Special target for canvas center
        value: 'Click game area',
        timestamp: Date.now(),
      });

      // Click any visible buttons
      actions.push({
        type: 'click',
        target: 'button', // Click first button
        value: 'Click button',
        timestamp: Date.now(),
      });
    }

    // Priority 5: Wait actions for letting game settle
    actions.push({
      type: 'wait',
      duration: 1000,
      timestamp: Date.now(),
    });

    console.log(`✓ Generated ${actions.length} actions`);
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
