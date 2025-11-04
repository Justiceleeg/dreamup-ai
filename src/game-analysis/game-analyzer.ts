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
4. How do you start playing?
5. What are the main controls and mechanics?
6. Are there any visible instructions on screen?

Be specific about keyboard keys (use exact names like "ArrowUp", "ArrowDown", "Space", "Enter", "w", "a", "s", "d", etc.)
Focus on the most important controls for playing the game.`;

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
        const keyPatterns: Record<string, string[]> = {
          'arrow': ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
          'wasd': ['w', 'a', 's', 'd'],
          'space': ['Space'],
          'enter': ['Enter'],
          'click': ['click'],
        };

        for (const [pattern, keys] of Object.entries(keyPatterns)) {
          if (instructionText.includes(pattern)) {
            result.keyboardKeys = [...(result.keyboardKeys || []), ...keys];
          }
        }

        // Check for visible buttons/clickables
        const buttons = document.querySelectorAll('button, [role="button"], a.button');
        if (buttons.length > 0) {
          result.mouseActions = ['click'];
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
}
