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
    console.log(`   Start Action: ${analysis.startAction}${analysis.startActionLabel ? ` (${analysis.startActionLabel})` : ''}`);

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
    } else if (analysis.startAction === 'key') {
      // Use a start key (Space or Enter typically)
      console.log(`   → Will press Space/Enter to start`);
      actions.push({
        type: 'key',
        value: 'Space',
        timestamp: Date.now(),
      });
    }
    // If startAction === 'auto', no startup action needed

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

    // Priority 3: Add action keys (spacebar, letters, etc.)
    // For letter-based games, sample representative letters instead of all 26
    const actionKeys = this.getActionKeys(analysis);
    let sampledKeys = actionKeys;

    // If we have many letter keys (e.g., all 26), sample just a few for efficiency
    if (actionKeys.length > 10) {
      const letterKeys = actionKeys.filter(k => /^[a-z]$/.test(k));
      const otherKeys = actionKeys.filter(k => !/^[a-z]$/.test(k));

      // Keep common, frequently-used letters: A, E, I, O, U, R, S, T, N, L
      const frequentLetters = ['a', 'e', 'i', 'o', 'u', 'r', 's', 't', 'n', 'l'];
      const sampledLetters = frequentLetters.filter(l => letterKeys.includes(l));

      sampledKeys = [...sampledLetters, ...otherKeys];
      console.log(`   Letter sampling: ${letterKeys.length} → ${sampledLetters.length} representative letters`);
    }

    for (const key of sampledKeys) {
      actions.push({
        type: 'key',
        value: key,
        timestamp: Date.now(),
      });
    }

    // Priority 4: Add additional mouse clicks if not already added
    if (!analysis.mouseActions.includes('click') && !analysis.gameName.toLowerCase().includes('wordle')) {
      actions.push({
        type: 'click',
        target: 'canvas:center',
        value: 'Click game area',
        timestamp: Date.now(),
      });

      actions.push({
        type: 'click',
        target: 'button',
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
