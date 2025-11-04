/**
 * Game State Analyzer Module
 *
 * Analyzes current game state before each action to:
 * - Detect if a modal/dialog is blocking gameplay
 * - Identify new interactive elements that appeared
 * - Determine what action should be taken next
 * - Respond to dynamic UI changes
 */

import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import * as fs from 'fs';

const gameStateSchema = z.object({
  isBlocked: z
    .boolean()
    .describe('Whether gameplay is blocked by a modal, dialog, or splash screen'),
  blockedBy: z
    .string()
    .optional()
    .describe('Description of what is blocking gameplay (e.g., "How to Play modal", "Loading screen")'),
  recommendedAction: z
    .enum(['close_modal', 'dismiss_dialog', 'click_button', 'press_key', 'wait', 'continue_game'])
    .describe('What action to take: close/dismiss blocking UI, or continue with game action'),
  recommendedTarget: z
    .string()
    .optional()
    .describe('Specific button text or element to interact with (e.g., "Close", "Next", "Play")'),
  gameplayReady: z
    .boolean()
    .describe('Whether the game is ready for normal gameplay actions'),
  availableControls: z
    .array(z.string())
    .describe('What controls/actions are currently available (e.g., ["keyboard", "mouse click", "button input"])'),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe('Confidence in this analysis (0-100)'),
  reasoning: z
    .string()
    .describe('Brief explanation of the current state and recommendation'),
});

export type GameState = z.infer<typeof gameStateSchema>;

/**
 * Analyzes current game state from a screenshot
 */
export class GameStateAnalyzer {
  private modelName: string = 'gpt-4o';
  private apiKey: string;
  private extractedModalContent: string | null = null; // Cache modal content for control analysis

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
  }

  /**
   * Extract modal/dialog content from the page (text-only)
   * This helps determine game controls from instructions shown in modals
   *
   * @param page - Playwright page object
   * @returns Text content of any visible modal/dialog, or null
   */
  async extractModalContent(page: any): Promise<string | null> {
    try {
      const modalContent = await page.evaluate(() => {
        // Find modal/dialog elements
        const modal = document.querySelector('[role="dialog"], [aria-modal="true"], .modal, .popup');
        if (!modal) return null;

        // Extract all text content from the modal
        return modal.textContent?.trim() || null;
      });

      if (modalContent) {
        console.log(`📖 Extracted modal content: "${modalContent.substring(0, 100)}..."`);
        this.extractedModalContent = modalContent;
      }
      return modalContent;
    } catch (error) {
      console.warn(`⚠ Failed to extract modal content: ${error}`);
      return null;
    }
  }

  /**
   * Get cached modal content
   */
  getModalContent(): string | null {
    return this.extractedModalContent;
  }

  /**
   * Analyze current game state from screenshot
   * Used before each action to determine if we need to handle blocking UI first
   *
   * @param screenshotPath - Path to current screenshot
   * @returns Current game state analysis
   */
  async analyzeGameState(screenshotPath: string): Promise<GameState> {
    try {
      if (!fs.existsSync(screenshotPath)) {
        throw new Error(`Screenshot not found: ${screenshotPath}`);
      }

      const imageBuffer = fs.readFileSync(screenshotPath);
      const base64Image = imageBuffer.toString('base64');

      const prompt = `Analyze this current game state screenshot and provide:

1. Is gameplay blocked? (by modal, dialog, splash screen, loading, etc.)
2. If blocked, what is blocking it and how to dismiss it?
3. What action should be taken next?
4. What controls are currently available?
5. Is the game ready for normal gameplay?

Be specific:
- If there's a modal/dialog, identify the close button (X, Close, Dismiss, OK, Next, etc.)
- Distinguish between:
  * Blocking UI (modals, splash screens) that must be dismissed first
  * Game UI (menus, HUD) that might be part of normal gameplay
- Identify available input methods (keyboard, mouse clicks, buttons)

Respond with your analysis.`;

      const response = await generateObject({
        model: openai(this.modelName),
        schema: gameStateSchema,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image',
                image: base64Image,
              },
            ],
          },
        ],
      });

      return response.object;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠ Game state analysis failed: ${errorMsg}`);
      // Return a safe default state
      return {
        isBlocked: false,
        recommendedAction: 'continue_game',
        gameplayReady: true,
        availableControls: ['keyboard', 'mouse'],
        confidence: 0,
        reasoning: 'Analysis failed, assuming game is ready for gameplay',
      };
    }
  }
}
