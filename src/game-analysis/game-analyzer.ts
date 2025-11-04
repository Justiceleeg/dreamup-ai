/**
 * Game Analyzer Module
 *
 * Analyzes game pages to determine:
 * - Game type and name
 * - Likely input methods (keyboard keys, mouse clicks)
 * - How to start/play the game
 * - Game mechanics and controls
 *
 * Uses multi-layered approach:
 * 1. HTML/DOM analysis (fast, free)
 * 2. Vision API analysis (accurate, costs API calls)
 */

import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import * as fs from 'fs';
import type { Page } from '@browserbasehq/stagehand/types/page';

/**
 * Game analysis result schema
 */
const gameAnalysisSchema = z.object({
  gameName: z.string().describe('The name or type of game'),
  gameType: z.enum(['canvas', 'dom', 'webgl', 'mixed', 'unknown']).describe('Type of rendering'),
  keyboardKeys: z
    .array(z.string())
    .describe('List of keyboard keys used (e.g., ["ArrowUp", "ArrowDown", "Space"])'),
  mouseActions: z
    .array(z.string())
    .describe('Mouse actions used (e.g., ["click", "drag"])'),
  startInstructions: z.string().describe('How to start the game'),
  startAction: z
    .enum(['button', 'key', 'auto'])
    .describe('Primary action to start the game: "button" (click a button), "key" (press a key), or "auto" (game starts automatically)'),
  startActionLabel: z
    .string()
    .optional()
    .describe('Label of the button to click if startAction is "button" (e.g., "Play", "Start Game")'),
  hasModal: z
    .boolean()
    .optional()
    .describe('Whether there is a modal/dialog that needs to be dismissed first'),
  controlsDescription: z.string().describe('Description of game controls'),
  visibleInstructions: z.string().describe('Any visible instructions on the screen'),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe('Confidence in the analysis (0-100)'),
});

export type GameAnalysis = z.infer<typeof gameAnalysisSchema>;

/**
 * Game Analyzer for determining game mechanics and controls
 */
export class GameAnalyzer {
  private modelName: string = 'gpt-4o';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
  }

  /**
   * Analyze game from screenshot using vision API
   *
   * @param screenshotPath - Path to screenshot file
   * @returns Game analysis with controls and mechanics
   */
  async analyzeGameFromScreenshot(screenshotPath: string): Promise<GameAnalysis> {
    console.log('🎮 Analyzing game from screenshot with vision API...');

    try {
      if (!fs.existsSync(screenshotPath)) {
        throw new Error(`Screenshot not found: ${screenshotPath}`);
      }

      const imageBuffer = fs.readFileSync(screenshotPath);
      const base64Image = imageBuffer.toString('base64');

      const prompt = `Analyze this game screenshot and provide detailed information about:
1. What game is this? (name and type)
2. What keyboard keys are used? (arrow keys, spacebar, wasd, etc.)
3. What mouse actions are supported? (click, drag, etc.)
4. **CRITICAL: How do you START playing this game?**
   - Is there a visible button to click? If yes, what does it say? (e.g., "Play", "Start", "Begin")
   - Or do you need to press a key? If yes, which key?
   - Or does the game start automatically?
5. Once started, what are the main controls and mechanics?
6. Are there any visible instructions on screen?

IMPORTANT:
- Be specific about keyboard keys (use exact names like "ArrowUp", "ArrowDown", "Space", "Enter", "w", "a", "s", "d", etc.)
- Focus on the most important controls for playing the game
- For startAction:
  * Choose "button" ONLY if there's a prominent, dedicated START button (labeled "Play", "Start", "Begin", "Play Now", etc.)
  * Choose "key" if you press a key (Space, Enter) to start the game
  * Choose "auto" if the game starts automatically / is already playable
  * Do NOT choose "button" for menu buttons like "Settings", "How to Play", "Options", etc.
- For startActionLabel: if startAction is "button", put the exact text visible on the START button
  * Include ONLY the primary start button that lets you play the game
  * Do NOT include menu navigation buttons or general UI buttons`;

      const response = await generateObject({
        model: openai(this.modelName),
        schema: gameAnalysisSchema,
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

      console.log(`✓ Game analysis complete: ${response.object.gameName}`);
      console.log(`  Type: ${response.object.gameType}`);
      console.log(`  Keys: ${response.object.keyboardKeys.join(', ')}`);

      return response.object;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠ Vision analysis failed: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Analyze game from HTML page
   * Fast, free analysis without API calls
   *
   * @param page - Playwright page object
   * @returns Basic game analysis from HTML
   */
  async analyzeGameFromHTML(page: any): Promise<Partial<GameAnalysis>> {
    console.log('📄 Analyzing game from HTML...');

    try {
      const analysis = await page.evaluate(() => {
        const result: Partial<GameAnalysis> = {
          keyboardKeys: [],
          mouseActions: [],
          visibleInstructions: '',
          controlsDescription: '',
          confidence: 0,
        };

        // Get game title
        const titleEl = document.querySelector('title');
        result.gameName = titleEl?.textContent || 'Unknown Game';

        // Look for instructions in common places
        const instructionSelectors = [
          '#instructions',
          '#help',
          '#gameRules',
          '.instructions',
          '.help',
          '.rules',
          '[data-instructions]',
          'h1',
          'h2',
        ];

        for (const selector of instructionSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const text = el.textContent || '';
            if (text.length > 0 && text.length < 500) {
              result.visibleInstructions = text;
              break;
            }
          }
        }

        // Check for canvas (likely indicates different control scheme)
        const canvases = document.querySelectorAll('canvas');
        result.gameType = canvases.length > 0 ? 'canvas' : 'dom';

        // Common keyboard patterns in instructions
        const instructionText = result.visibleInstructions.toLowerCase();
        const gameNameLower = result.gameName?.toLowerCase() || '';
        const keyPatterns: Record<string, string[]> = {
          'arrow': ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
          'wasd': ['w', 'a', 's', 'd'],
          'space': ['Space'],
          'enter': ['Enter'],
          'click': ['click'],
          'letter': ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
          'word': ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
          'type': ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        };

        for (const [pattern, keys] of Object.entries(keyPatterns)) {
          if (instructionText.includes(pattern)) {
            result.keyboardKeys = [...(result.keyboardKeys || []), ...keys];
          }
        }

        // Special case: Wordle and similar games are explicitly letter-based
        if (gameNameLower.includes('wordle') || gameNameLower.includes('spelling') ||
            instructionText.includes('wordle') || instructionText.includes('word') ||
            instructionText.includes('guess')) {
          if (!result.keyboardKeys?.some(k => typeof k === 'string' && k.match(/[a-z]/))) {
            // Add all letters if not already detected
            const allLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
            result.keyboardKeys = [...(result.keyboardKeys || []), ...allLetters];
          }
          // Always add Enter and Backspace for word games
          if (!result.keyboardKeys?.includes('Enter')) result.keyboardKeys?.push('Enter');
          if (!result.keyboardKeys?.includes('Backspace')) result.keyboardKeys?.push('Backspace');
        }

        // Check for modals/dialogs that need to be dismissed first
        const modal = document.querySelector('[role="dialog"], .modal, .popup, [aria-modal="true"]');
        result.hasModal = !!modal;
        if (modal) {
          // Look for close button (X, close, dismiss, etc.)
          const closeButton = modal.querySelector('[aria-label*="close"], [aria-label*="dismiss"], button[aria-label*="Close"], .close-button, .modal-close');
          if (closeButton) {
            result.startActionLabel = 'close modal';
          }
        }

        // Check for visible buttons/clickables
        const buttons = document.querySelectorAll('button, [role="button"], a.button');
        if (buttons.length > 0) {
          result.mouseActions = ['click'];

          // If there's a modal, prioritize closing it first
          if (result.hasModal) {
            result.startAction = 'button' as any;
            result.startActionLabel = 'close modal (X button)';
          } else {
            // Detect start action from button labels
            // Be specific: only detect "Play" button or similar clear game-start buttons
            // Don't detect "New Game" as it might be in a menu
            result.startAction = 'button' as any;
            const startKeywords = ['play', 'play game', 'play now', 'begin', 'start game'];
            for (const btn of buttons) {
              const text = (btn.textContent || '').trim().toLowerCase();
              for (const keyword of startKeywords) {
                if (text === keyword || text.startsWith(keyword)) {
                  result.startActionLabel = btn.textContent?.trim();
                  result.startAction = 'button' as any;
                  break;
                }
              }
              if (result.startActionLabel) break;
            }

            // If no specific start button found, fall back to keyboard
            if (!result.startActionLabel) {
              result.startAction = 'auto' as any; // Let the game start naturally
            }
          }
        } else {
          // No buttons found, assume keyboard start
          result.startAction = 'key' as any;
        }

        // Set confidence based on what we found
        let confidence = 20; // Base confidence
        if (result.visibleInstructions) confidence += 30;
        if (result.keyboardKeys && result.keyboardKeys.length > 0) confidence += 25;
        if (result.mouseActions && result.mouseActions.length > 0) confidence += 15;
        result.confidence = Math.min(confidence, 70); // Cap at 70 for HTML-only analysis

        return result;
      });

      console.log(`✓ HTML analysis complete: confidence ${analysis.confidence}%`);
      return analysis;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠ HTML analysis failed: ${errorMsg}`);
      return { confidence: 0, keyboardKeys: [], mouseActions: [] };
    }
  }

  /**
   * Analyze game with fallback strategy
   * Try HTML first (fast), fall back to vision API if needed
   *
   * @param page - Playwright page object
   * @param screenshotPath - Path to screenshot for vision analysis
   * @param minConfidence - Minimum confidence threshold for HTML analysis
   * @returns Complete game analysis
   */
  async analyzeGame(
    page: any,
    screenshotPath: string,
    minConfidence: number = 60
  ): Promise<GameAnalysis> {
    console.log('🔍 Starting game analysis...');

    // Try HTML analysis first (fast, free)
    const htmlAnalysis = await this.analyzeGameFromHTML(page);

    // If HTML analysis has high enough confidence, use it
    if (htmlAnalysis.confidence && htmlAnalysis.confidence >= minConfidence) {
      console.log(`✓ Using HTML analysis (confidence: ${htmlAnalysis.confidence}%)`);
      return htmlAnalysis as GameAnalysis;
    }

    // Fall back to vision API
    console.log(`⚠ HTML confidence too low (${htmlAnalysis.confidence}%), using vision API...`);
    const visionAnalysis = await this.analyzeGameFromScreenshot(screenshotPath);

    return visionAnalysis;
  }

  /**
   * Expand letter ranges like "A-Z" or "letters A-Z" into individual letter keys
   * @param keys - Array of key descriptions
   * @returns Expanded array with individual letters
   */
  private expandLetterRanges(keys: string[]): string[] {
    const expanded: string[] = [];

    for (const key of keys) {
      const lower = key.toLowerCase();

      // Handle "letters A-Z" or "a-z" or "A-Z"
      if (lower.includes('letter') && lower.includes('a') && lower.includes('z')) {
        // Add common letter keys for word games
        for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')) {
          expanded.push(letter.toLowerCase());
        }
      }
      // Handle explicit ranges like "A-Z"
      else if (key.includes('-') && key.length <= 3) {
        const parts = key.split('-');
        if (parts.length === 2) {
          const start = parts[0].charCodeAt(0);
          const end = parts[1].charCodeAt(0);
          for (let i = start; i <= end; i++) {
            expanded.push(String.fromCharCode(i).toLowerCase());
          }
        } else {
          expanded.push(key);
        }
      }
      // Keep other keys as-is
      else {
        expanded.push(key);
      }
    }

    return expanded;
  }

  /**
   * Analyze game controls from modal/instruction text
   * Used when modal content provides explicit control instructions
   *
   * @param modalContent - Text content from modal/instructions
   * @param screenshotPath - Path to screenshot for fallback vision analysis
   * @returns Game analysis based on instructions
   */
  async analyzeGameFromInstructions(modalContent: string, screenshotPath: string): Promise<GameAnalysis> {
    if (!modalContent || modalContent.length === 0) {
      console.log('⚠ No modal content provided, falling back to screenshot analysis');
      return this.analyzeGameFromScreenshot(screenshotPath);
    }

    console.log('📖 Analyzing game from modal instructions...');

    try {
      const imageBuffer = fs.readFileSync(screenshotPath);
      const base64Image = imageBuffer.toString('base64');

      const prompt = `You are analyzing a game based on modal instructions and a screenshot.

**Modal/Instructions Content:**
${modalContent}

**Your task:**
1. Based on the instructions, what game is this?
2. What keyboard keys should be used? (Be specific: "letters A-Z", "arrow keys", "Space", "Enter", etc.)
3. What mouse actions are supported?
4. How to start the game? (button, key, or auto)
5. What are the main controls?

**IMPORTANT:**
- Prioritize the instructions text over visual analysis
- If instructions mention letter input, use LETTERS as controls (not arrows)
- If instructions mention arrow keys, use ARROWS
- Be specific about the actual controls mentioned`;

      const response = await generateObject({
        model: openai(this.modelName),
        schema: gameAnalysisSchema,
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

      console.log(`✓ Game analysis from instructions: ${response.object.gameName}`);
      console.log(`  Controls: ${response.object.keyboardKeys.join(', ')}`);

      // Expand letter ranges like "A-Z" into individual letters for action builder
      const expandedKeys = this.expandLetterRanges(response.object.keyboardKeys);
      response.object.keyboardKeys = expandedKeys;
      console.log(`  Expanded controls: ${expandedKeys.join(', ')}`);

      return response.object;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠ Instruction analysis failed: ${errorMsg}, falling back to screenshot analysis`);
      return this.analyzeGameFromScreenshot(screenshotPath);
    }
  }
}
