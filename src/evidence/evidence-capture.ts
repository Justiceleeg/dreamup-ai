/**
 * Evidence Capture Module
 *
 * Handles collection and organization of test artifacts:
 * - Screenshots at key moments
 * - Browser console logs
 * - Manifest files with metadata
 */

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { Page } from '@browserbasehq/stagehand/types/page';
import { randomUUID } from 'crypto';

// Type for page objects (can be Stagehand Page or Playwright Page from context.pages())
type PageLike = Page | any;

/**
 * Screenshot metadata
 */
export interface ScreenshotMetadata {
  filename: string;
  timestamp: number;
  url: string;
  description: string;
  index: number;
}

/**
 * Console log entry
 */
export interface ConsoleLogEntry {
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
  args?: string[];
}

/**
 * Test artifacts manifest
 */
export interface TestManifest {
  gameId: string;
  testId: string;
  timestamp: string;
  gameUrl: string;
  screenshots: ScreenshotMetadata[];
  consoleLogs: ConsoleLogEntry[];
  testStartTime: number;
  testEndTime?: number;
  totalDuration?: number;
}

/**
 * Evidence Capture Manager
 */
export class EvidenceCapture {
  private gameId: string;
  private testId: string;
  private testDir: string;
  private outputDir: string;
  private screenshots: ScreenshotMetadata[] = [];
  private consoleLogs: ConsoleLogEntry[] = [];
  private testStartTime: number;
  private screenshotCount: number = 0;

  constructor(gameUrl: string, outputDir: string = './test-results') {
    // Generate unique identifiers
    this.gameId = this.generateGameId(gameUrl);
    this.testId = randomUUID();
    this.outputDir = outputDir;
    this.testDir = join(this.outputDir, this.gameId, this.getTimestamp());
    this.testStartTime = Date.now();
  }

  /**
   * Generate game ID from URL
   *
   * @param url - Game URL
   * @returns Game ID (max 50 chars, alphanumeric and hyphens)
   */
  private generateGameId(url: string): string {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, '');
      const hash = this.simpleHash(url).toString(16).substring(0, 8);
      const combined = `${domain}-${hash}`.toLowerCase();
      return combined.replace(/[^a-z0-9-]/g, '').substring(0, 50);
    } catch {
      return `game-${randomUUID().substring(0, 8)}`;
    }
  }

  /**
   * Simple hash function for URL
   *
   * @param str - String to hash
   * @returns Hash number
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get ISO timestamp
   *
   * @returns Formatted timestamp
   */
  private getTimestamp(): string {
    const date = new Date();
    return date.toISOString().replace(/[:.]/g, '-').substring(0, 19);
  }

  /**
   * Ensure test directory exists
   */
  async ensureDirectories(): Promise<void> {
    try {
      await mkdir(this.testDir, { recursive: true });
      console.log(`✓ Test directory created: ${this.testDir}`);
    } catch (error) {
      throw new Error(
        `Failed to create test directory: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Capture screenshot from page
   *
   * @param page - Page object (Stagehand or Playwright page from context.pages())
   * @param description - Description of what the screenshot shows
   * @returns Path to saved screenshot
   */
  async captureScreenshot(
    page: PageLike,
    description: string = 'Screenshot'
  ): Promise<string> {
    try {
      // Ensure directory exists
      await this.ensureDirectories();

      const index = this.screenshotCount++;
      const timestamp = Date.now();
      const filename = `screenshot-${String(index).padStart(3, '0')}.png`;
      const filepath = join(this.testDir, filename);

      console.log(`📸 Capturing screenshot: ${filename}`);

      // Capture screenshot - handle both Stagehand and Playwright page objects
      // Note: For remote browsers (Browserbase), we can't use the path parameter
      // Instead, we capture as a buffer and write it locally
      let screenshotBuffer: Buffer | null = null;

      try {
        if (typeof (page as any).screenshot === 'function') {
          // Call screenshot WITHOUT path parameter to get buffer
          // Then write it to disk locally
          screenshotBuffer = await (page as any).screenshot();

          if (!screenshotBuffer) {
            throw new Error('Screenshot method returned no buffer');
          }
        } else {
          throw new Error('No screenshot method found on page object');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`✗ Failed to capture screenshot: ${errorMsg}`);
        throw new Error(`Screenshot capture failed: ${errorMsg}`);
      }

      // Now write the buffer to disk locally
      try {
        await writeFile(filepath, screenshotBuffer);
        console.log(`✓ Screenshot written to: ${filepath}`);
      } catch (writeError) {
        const writeMsg = writeError instanceof Error ? writeError.message : String(writeError);
        console.error(`✗ Failed to write screenshot to disk: ${writeMsg}`);
        throw new Error(`Failed to save screenshot to disk: ${writeMsg}`);
      }

      // Get URL and title for metadata
      let url = '';
      let title = '';

      try {
        if (typeof (page as any).url === 'function') {
          url = (page as any).url();
        }
        if (typeof (page as any).title === 'function') {
          title = await (page as any).title();
        }
      } catch {
        console.warn('⚠ Could not retrieve page URL or title');
      }

      // Store metadata
      const metadata: ScreenshotMetadata = {
        filename,
        timestamp,
        url,
        description,
        index,
      };

      this.screenshots.push(metadata);

      console.log(`✓ Screenshot saved: ${filename}`);
      return filepath;
    } catch (error) {
      console.error(
        `Failed to capture screenshot: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Capture multiple screenshots at once
   *
   * @param page - Stagehand page object
   * @param descriptions - Array of descriptions
   * @returns Array of file paths
   */
  async captureMultipleScreenshots(
    page: Page,
    descriptions: string[] = []
  ): Promise<string[]> {
    const paths: string[] = [];

    for (let i = 0; i < descriptions.length; i++) {
      try {
        const path = await this.captureScreenshot(page, descriptions[i]);
        paths.push(path);
      } catch (error) {
        console.warn(`Failed to capture screenshot ${i + 1}: ${error}`);
        // Continue capturing even if one fails
      }
    }

    return paths;
  }

  /**
   * Setup console logging capture
   *
   * @param page - Stagehand page object
   */
  setupConsoleCapture(page: Page): void {
    // Note: Console message capture is handled via browser listener
    // This is a placeholder for setup if needed
    console.log('✓ Console capture configured');
  }

  /**
   * Add console log entry
   *
   * @param level - Log level
   * @param message - Log message
   * @param args - Additional arguments
   */
  addConsoleLog(
    level: 'log' | 'warn' | 'error' | 'info',
    message: string,
    args?: string[]
  ): void {
    this.consoleLogs.push({
      level,
      message,
      timestamp: Date.now(),
      args,
    });
  }

  /**
   * Save console logs to file
   */
  async saveConsoleLogs(): Promise<string> {
    try {
      await this.ensureDirectories();

      const filepath = join(this.testDir, 'console.log');
      const content = this.formatConsoleLogs();

      await writeFile(filepath, content, 'utf-8');

      console.log(`✓ Console logs saved: console.log`);
      return filepath;
    } catch (error) {
      throw new Error(
        `Failed to save console logs: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Format console logs as text
   *
   * @returns Formatted console logs
   */
  private formatConsoleLogs(): string {
    if (this.consoleLogs.length === 0) {
      return 'No console logs captured\n';
    }

    const lines = this.consoleLogs.map((log) => {
      const timeStr = new Date(log.timestamp).toISOString();
      const level = log.level.toUpperCase().padEnd(5);
      const args = log.args ? ` ${log.args.join(' ')}` : '';
      return `[${timeStr}] [${level}] ${log.message}${args}`;
    });

    return lines.join('\n') + '\n';
  }

  /**
   * Generate and save manifest file
   *
   * @param gameUrl - Original game URL
   * @returns Path to manifest file
   */
  async saveManifest(gameUrl: string): Promise<string> {
    try {
      await this.ensureDirectories();

      const testEndTime = Date.now();
      const manifest: TestManifest = {
        gameId: this.gameId,
        testId: this.testId,
        timestamp: new Date(this.testStartTime).toISOString(),
        gameUrl,
        screenshots: this.screenshots,
        consoleLogs: this.consoleLogs,
        testStartTime: this.testStartTime,
        testEndTime,
        totalDuration: testEndTime - this.testStartTime,
      };

      const filepath = join(this.testDir, 'manifest.json');
      await writeFile(filepath, JSON.stringify(manifest, null, 2), 'utf-8');

      console.log(`✓ Manifest saved: manifest.json`);
      return filepath;
    } catch (error) {
      throw new Error(
        `Failed to save manifest: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get all captured screenshot paths
   *
   * @returns Array of screenshot paths
   */
  getScreenshotPaths(): string[] {
    return this.screenshots.map((meta) => join(this.testDir, meta.filename));
  }

  /**
   * Get test directory path
   *
   * @returns Test directory path
   */
  getTestDir(): string {
    return this.testDir;
  }

  /**
   * Get game ID
   *
   * @returns Game ID
   */
  getGameId(): string {
    return this.gameId;
  }

  /**
   * Get test ID
   *
   * @returns Test ID
   */
  getTestId(): string {
    return this.testId;
  }

  /**
   * Get screenshot count
   *
   * @returns Number of screenshots captured
   */
  getScreenshotCount(): number {
    return this.screenshotCount;
  }

  /**
   * Get console log count
   *
   * @returns Number of console logs captured
   */
  getConsoleLogCount(): number {
    return this.consoleLogs.length;
  }

  /**
   * Get all console logs
   *
   * @returns Array of console log entries or formatted string
   */
  getConsoleLogs(): string[] {
    return this.consoleLogs.map((log) => {
      const level = log.level.toUpperCase();
      return `[${level}] ${log.message}`;
    });
  }
}
