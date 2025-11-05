/**
 * Stagehand Act Interactor Module
 *
 * Uses Stagehand's agent.act() method as the primary interaction mechanism.
 * This leverages Stagehand's vision and understanding to execute intent-based actions
 * rather than low-level keyboard/mouse commands.
 */

import type { Stagehand } from '@browserbasehq/stagehand';
import type { Action } from '../shared/types.js';
import { executeWithTimeout, getTimeout, TimeoutError } from '../utils/timeout-utils.js';

export interface ActResult {
  success: boolean;
  message: string;
  actionDescription?: string;
  duration: number;
}

export interface GameContextOptions {
  gameName?: string;
  gameType?: 'dom' | 'canvas' | 'hybrid';
  controls?: string[];
}

export interface LearnedInteraction {
  actionType: string;
  instruction: string;
  successCount: number;
  failureCount: number;
  lastUsed: number;
  context: string; // e.g., "Wordle input field", "2048 board"
}

export interface ObservedAction {
  action: string;
  xpath?: string;
  description?: string;
}

export interface PageState {
  observedAt: number;
  availableActions: ObservedAction[];
  actionCount: number;
  hasInputFields: boolean;
  hasButtons: boolean;
}

/**
 * Interactor using Stagehand's act() method
 * Delegates complex action understanding to Stagehand's AI capabilities
 * Also learns from successful interactions to improve future instructions
 */
export class StagehandActInteractor {
  private stagehand: Stagehand | null = null;
  private actionHistory: { instruction: string; result: ActResult }[] = [];
  private lastError: string | null = null;
  private gameContext: GameContextOptions | null = null;
  private learnedInteractions: Map<string, LearnedInteraction> = new Map();
  private pageState: PageState | null = null;
  private actionAttempts: Map<string, number> = new Map(); // Track how many times we've tried each action

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
   * Set game context for better instruction generation
   * This helps Stagehand understand which game is being played and generate more specific instructions
   */
  setGameContext(context: GameContextOptions): void {
    this.gameContext = context;
  }

  /**
   * Record a successful interaction for learning
   * This builds up knowledge about what works in this game
   */
  recordSuccessfulInteraction(
    actionType: string,
    instruction: string,
    context: string = this.gameContext?.gameName || 'unknown'
  ): void {
    const key = `${actionType}-${context}`;
    const existing = this.learnedInteractions.get(key);

    if (existing) {
      existing.successCount++;
      existing.lastUsed = Date.now();
    } else {
      this.learnedInteractions.set(key, {
        actionType,
        instruction,
        successCount: 1,
        failureCount: 0,
        lastUsed: Date.now(),
        context,
      });
    }

    console.log(`💾 Learned: ${actionType} works in ${context} (${existing?.successCount || 1} successful)`);
  }

  /**
   * Record a failed interaction for learning
   */
  recordFailedInteraction(
    actionType: string,
    instruction: string,
    context: string = this.gameContext?.gameName || 'unknown'
  ): void {
    const key = `${actionType}-${context}`;
    const existing = this.learnedInteractions.get(key);

    if (existing) {
      existing.failureCount++;
    } else {
      this.learnedInteractions.set(key, {
        actionType,
        instruction,
        successCount: 0,
        failureCount: 1,
        lastUsed: Date.now(),
        context,
      });
    }
  }

  /**
   * Get learned interactions for the current game
   * Returns interactions sorted by success rate
   */
  getLearnedInteractions(gameContext?: string): LearnedInteraction[] {
    const context = gameContext || this.gameContext?.gameName || 'unknown';
    const filtered = Array.from(this.learnedInteractions.values()).filter((i) => i.context === context);

    // Sort by success rate (success / total attempts)
    return filtered.sort((a, b) => {
      const aRate = a.successCount / (a.successCount + a.failureCount);
      const bRate = b.successCount / (b.successCount + b.failureCount);
      return bRate - aRate;
    });
  }

  /**
   * Enhance instruction with learned context
   * If we've already successfully done something similar, remind Stagehand of that
   */
  enhanceInstructionWithLearning(instruction: string, actionType: string): string {
    const learned = this.getLearnedInteractions();
    if (learned.length === 0) {
      return instruction;
    }

    // Find the most successful similar action
    const successful = learned.filter((i) => i.successCount > 0);
    if (successful.length === 0) {
      return instruction;
    }

    const bestPractice = successful[0];
    return `${instruction}. Based on previous interactions, we know ${bestPractice.instruction} works.`;
  }

  /**
   * Execute an action using Stagehand's act() method
   * Following V3 best practices: observe to discover actions, then act on them
   * Uses observed state to guide action execution and validate that required elements exist
   * Also learns from successes/failures to improve future actions
   *
   * @param instruction - Natural language instruction (e.g., "Click the submit button", "Make a move in the game")
   * @param actionType - Type of action for learning tracking (e.g., "click", "key", "type")
   * @returns Result of the action
   */
  async executeActionWithAct(instruction: string, actionType: string = 'action'): Promise<ActResult> {
    if (!this.stagehand) {
      return {
        success: false,
        message: 'Stagehand instance not set',
        duration: 0,
      };
    }

    const startTime = Date.now();

    try {
      // Enhance instruction with what we've learned so far
      const enhancedInstruction = this.enhanceInstructionWithLearning(instruction, actionType);
      console.log(`🤖 Executing with stagehand.act(): ${enhancedInstruction}`);

      // Stagehand V3 best practice: observe() first to discover available actions
      // Use specific, contextual instructions (not vague ones) as per documentation
      console.log(`  👁️  Observing page for elements to interact with...`);
      let observedActions: ObservedAction[] = [];
      let hasRelevantElements = false;

      try {
        // Convert vague instruction to specific observation request
        // e.g., "Press Enter" becomes "find the submit or enter button"
        const observeInstruction = this.getSpecificObserveInstruction(enhancedInstruction);

        // Wrap observe() with timeout to prevent hanging
        const rawObserved = await executeWithTimeout(
          () => this.stagehand!.observe(observeInstruction),
          getTimeout('STAGEHAND_OBSERVE'),
          `observe: ${observeInstruction}`
        );

        // Parse observed actions into structured format
        if (rawObserved && Array.isArray(rawObserved) && rawObserved.length > 0) {
          observedActions = rawObserved.map((action: any) => ({
            action: typeof action === 'string' ? action : action.action || String(action),
            xpath: action.xpath,
            description: action.description,
          }));
          hasRelevantElements = true;
          console.log(`  ✓ Found ${observedActions.length} interactive elements matching instruction`);
        } else {
          console.log(`  ℹ No elements found matching "${observeInstruction}"`);
        }

        // Update page state with observed actions
        this.updatePageState(observedActions);
      } catch (observeErr) {
        if (observeErr instanceof TimeoutError) {
          console.warn(`  ⊘ Observation timeout: ${observeErr.message}`);
        } else {
          console.warn(`  ⚠  Observation warning: ${observeErr instanceof Error ? observeErr.message : String(observeErr)}`);
        }
        // Continue with act() even if observe() fails - observe is informational
      }

      // VALIDATION: If observe found no relevant elements, decide whether to skip or proceed
      const attemptCount = (this.actionAttempts.get(instruction) || 0) + 1;
      this.actionAttempts.set(instruction, attemptCount);

      if (!hasRelevantElements && attemptCount > 2) {
        console.log(`  ⊘ Skipping: No relevant elements found after ${attemptCount} attempts`);
        this.recordFailedInteraction(actionType, instruction);
        return {
          success: false,
          message: `Skipped: No interactive elements found for this action. Try again with different action.`,
          duration: Date.now() - startTime,
        };
      }

      // ENHANCE INSTRUCTION with observed context
      // Tell Stagehand what elements are available so it makes better decisions
      let contextAugmentedInstruction = enhancedInstruction;
      if (observedActions.length > 0) {
        const actionDescriptions = observedActions
          .map((a) => a.description || a.action)
          .slice(0, 3)
          .join(', ');
        contextAugmentedInstruction += ` (Available options: ${actionDescriptions})`;
      }

      // Call stagehand.act() with the context-enhanced instruction
      // This method uses vision to understand the page and execute the action
      // Wrap with timeout to prevent hanging operations
      const result = await executeWithTimeout(
        () => this.stagehand!.act(contextAugmentedInstruction),
        getTimeout('STAGEHAND_ACT'),
        `act: ${contextAugmentedInstruction}`
      );

      const duration = Date.now() - startTime;

      if (result.success) {
        console.log(`✓ Action succeeded in ${duration}ms`);
        console.log(`  Description: ${result.actionDescription || 'N/A'}`);

        // Record this successful interaction for future reference
        this.recordSuccessfulInteraction(actionType, instruction);
        this.actionAttempts.set(instruction, 0); // Reset attempts on success

        this.actionHistory.push({
          instruction,
          result: {
            success: true,
            message: result.message,
            actionDescription: result.actionDescription,
            duration,
          },
        });

        this.lastError = null;

        return {
          success: true,
          message: result.message,
          actionDescription: result.actionDescription,
          duration,
        };
      } else {
        console.log(`✗ Action failed: ${result.message}`);

        // Record this failed interaction
        this.recordFailedInteraction(actionType, instruction);

        this.actionHistory.push({
          instruction,
          result: {
            success: false,
            message: result.message,
            duration,
          },
        });

        this.lastError = result.message;

        return {
          success: false,
          message: result.message,
          duration,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (error instanceof TimeoutError) {
        console.warn(`⊘ Action execution timeout: ${errorMsg}`);
      } else {
        console.warn(`⚠ Action execution error: ${errorMsg}`);
      }

      // Record this failed interaction
      this.recordFailedInteraction(actionType, instruction);

      this.lastError = errorMsg;

      return {
        success: false,
        message: `Error: ${errorMsg}`,
        duration,
      };
    }
  }

  /**
   * Convert a generic instruction to a specific observation request
   * Following Stagehand V3 best practices for specific, descriptive instructions
   *
   * @param instruction - Generic instruction like "Press Enter"
   * @returns Specific observation instruction like "find the submit or enter button"
   */
  private getSpecificObserveInstruction(instruction: string): string {
    // Map generic actions to specific observation queries
    const lowerInstruction = instruction.toLowerCase();

    // Key press patterns
    if (lowerInstruction.includes('press') || lowerInstruction.includes('key')) {
      if (lowerInstruction.includes('enter')) {
        return 'find the submit button, enter button, or any button that submits or confirms the action';
      }
      if (lowerInstruction.includes('space')) {
        return 'find any interactive element that responds to spacebar, like a start button or play button';
      }
      if (lowerInstruction.includes('arrow') || lowerInstruction.includes('left')) {
        return 'find interactive game elements that respond to arrow keys or directional input';
      }
      if (lowerInstruction.includes('escape')) {
        return 'find a close button, exit button, or modal overlay that can be dismissed';
      }
    }

    // Click patterns
    if (lowerInstruction.includes('click')) {
      if (lowerInstruction.includes('element')) {
        return 'find all interactive clickable elements on the page';
      }
      // If there's a specific label, use it
      const match = lowerInstruction.match(/click[^"]*"([^"]+)"/i);
      if (match && match[1]) {
        return `find the button or clickable element labeled "${match[1]}"`;
      }
      return 'find the primary interactive button or clickable element';
    }

    // Type patterns
    if (lowerInstruction.includes('type')) {
      const match = instruction.match(/type[^"]*"([^"]+)"/i);
      if (match && match[1]) {
        return `find the input field or text box where we should type "${match[1]}"`;
      }
      return 'find the text input field or text box';
    }

    // Fallback: return the instruction as-is but with more context
    return `find interactive elements needed for: ${instruction}`;
  }

  /**
   * Convert an Action object to a natural language instruction for stagehand.act()
   * Game-agnostic: works with any game without hardcoded knowledge
   *
   * @param action - Action object from ActionSetBuilder
   * @returns Natural language instruction
   */
  actionToInstruction(action: Action): string {
    switch (action.type) {
      case 'key':
        // Generic key instructions - no game-specific logic
        const keyName = action.value || 'Space';

        const keyDescriptions: Record<string, string> = {
          ArrowLeft: 'Use the left arrow key',
          ArrowRight: 'Use the right arrow key',
          ArrowUp: 'Use the up arrow key',
          ArrowDown: 'Use the down arrow key',
          Space: 'Press the spacebar',
          Enter: 'Press Enter',
          Escape: 'Press Escape',
          Backspace: 'Press Backspace',
          Tab: 'Press Tab',
        };

        return keyDescriptions[keyName] || `Press the ${keyName} key`;

      case 'click':
        // Extract the actual label/text if available
        if (action.value) {
          return action.value;
        }

        // Parse XPath to extract meaningful text
        const target = action.target || 'element';
        if (target.includes('contains(')) {
          const match = target.match(/contains\("([^"]+)"\)/);
          if (match) {
            return `Click the element labeled "${match[1]}"`;
          }
        }

        // Fallback to generic click
        return `Click on the element`;

      case 'type':
        // Generic typing - no game context
        const text = action.value || '';
        if (text) {
          return `Type "${text}"`;
        }
        return `Type text`;

      case 'wait':
        return `Wait for the page to update`;

      default:
        return action.value || `Perform an action`;
    }
  }

  /**
   * Execute a game move/action with intelligence-guided instructions
   *
   * @param gameContext - Context about what game is being played (e.g., "Wordle")
   * @param moveDescription - What kind of move to make (e.g., "enter a word and submit")
   * @returns Result of the action
   */
  async executeGameMove(gameContext: string, moveDescription: string): Promise<ActResult> {
    // Create a context-aware instruction
    const instruction = `In the ${gameContext} game, ${moveDescription}. Use your understanding of the game to execute this action appropriately.`;
    return this.executeActionWithAct(instruction);
  }

  /**
   * Get the action history
   */
  getActionHistory(): { instruction: string; result: ActResult }[] {
    return this.actionHistory;
  }

  /**
   * Get the last error
   */
  getLastError(): string | null {
    return this.lastError;
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.actionHistory.length === 0) {
      return 0;
    }
    const successful = this.actionHistory.filter((a) => a.result.success).length;
    return (successful / this.actionHistory.length) * 100;
  }

  /**
   * Update page state based on observed actions
   * Maintains knowledge of what interactive elements are available
   *
   * @param observedActions - Array of actions observed on the page
   */
  private updatePageState(observedActions: ObservedAction[]): void {
    const hasInputFields = observedActions.some((a) =>
      a.description?.toLowerCase().includes('input') ||
      a.description?.toLowerCase().includes('field') ||
      a.action?.toLowerCase().includes('input')
    );

    const hasButtons = observedActions.some((a) =>
      a.description?.toLowerCase().includes('button') ||
      a.description?.toLowerCase().includes('click') ||
      a.action?.toLowerCase().includes('button')
    );

    this.pageState = {
      observedAt: Date.now(),
      availableActions: observedActions,
      actionCount: observedActions.length,
      hasInputFields,
      hasButtons,
    };

    console.log(
      `  📋 Page state: ${observedActions.length} actions, inputs=${hasInputFields}, buttons=${hasButtons}`
    );
  }

  /**
   * Get current page state
   * Returns the last observed state of interactive elements on the page
   */
  getPageState(): PageState | null {
    return this.pageState;
  }

  /**
   * Check if specific type of element is available on page
   * Useful for deciding what actions to try next
   *
   * @param elementType - 'button' | 'input' | 'any'
   * @returns true if element type is available
   */
  hasElementAvailable(elementType: 'button' | 'input' | 'any' = 'any'): boolean {
    if (!this.pageState) return false;

    switch (elementType) {
      case 'button':
        return this.pageState.hasButtons;
      case 'input':
        return this.pageState.hasInputFields;
      case 'any':
        return this.pageState.actionCount > 0;
    }
  }

  /**
   * Get a description of currently available actions for debugging/logging
   */
  getAvailableActionsSummary(): string {
    if (!this.pageState || this.pageState.actionCount === 0) {
      return 'No interactive elements detected';
    }

    const summary = this.pageState.availableActions
      .slice(0, 5) // Show top 5
      .map((a) => a.description || a.action)
      .join(', ');

    return `${this.pageState.actionCount} elements: ${summary}${this.pageState.actionCount > 5 ? '...' : ''}`;
  }
}
