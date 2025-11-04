/**
 * Browser Agent Module
 *
 * Handles browser initialization, page navigation, and connection management
 * using Stagehand and Browserbase infrastructure.
 */

import { Stagehand } from '@browserbasehq/stagehand';
import type { Page } from '@browserbasehq/stagehand/types/page';
import type { BrowserSession } from './types.js';

/**
 * Browser Agent for controlling game interactions
 */
export class BrowserAgent {
  private stagehand: Stagehand | null = null;
  private page: Page | null = null;
  private session: BrowserSession | null = null;
  private readonly timeout: number;

  constructor(timeout: number = 300000) {
    this.timeout = timeout;
  }

  /**
   * Initialize browser session with Browserbase
   *
   * @returns Initialized Stagehand instance
   */
  async initializeBrowser(): Promise<Stagehand> {
    try {
      const apiKey = process.env.BROWSERBASE_API_KEY;
      const projectId = process.env.BROWSERBASE_PROJECT_ID;

      if (!apiKey) {
        throw new Error('BROWSERBASE_API_KEY not found in environment variables');
      }

      // Initialize Stagehand with Browserbase backend
      this.stagehand = new Stagehand({
        apiKey,
        projectId,
      });

      // Initialize the stagehand instance
      await this.stagehand.init();

      console.log('✓ Browserbase connection initialized');
      return this.stagehand;
    } catch (error) {
      throw new Error(
        `Failed to initialize browser: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load a game URL in the browser
   *
   * @param url - Game URL to load
   * @returns Page object
   */
  async loadGame(url: string): Promise<Page> {
    if (!this.stagehand) {
      throw new Error('Browser not initialized. Call initializeBrowser() first.');
    }

    try {
      // Validate URL
      new URL(url);

      console.log(`🌐 Loading game from: ${url}`);

      // Get the page from Stagehand after initialization
      this.page = this.stagehand.page;

      // Set up session tracking
      this.session = {
        url,
        isActive: true,
        startTime: Date.now(),
      };

      console.log('✓ Page created');

      // Navigate to URL with timeout
      await this.navigateWithTimeout(url);

      console.log('✓ Page loaded');
      return this.page;
    } catch (error) {
      await this.cleanup();
      throw new Error(
        `Failed to load game: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Navigate to URL with configurable timeout
   *
   * @param url - URL to navigate to
   * @param navigationTimeout - Optional timeout in milliseconds
   */
  private async navigateWithTimeout(
    url: string,
    navigationTimeout: number = 10000
  ): Promise<void> {
    if (!this.page) {
      throw new Error('No page available for navigation');
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Navigation timeout after ${navigationTimeout}ms`)), navigationTimeout)
    );

    const navigationPromise = this.page.goto(url, {
      waitUntil: 'domcontentloaded',
    });

    try {
      await Promise.race([navigationPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        console.warn(`⚠ Navigation timeout - page may still be loading`);
        // Don't throw - page might still be usable
      } else {
        throw error;
      }
    }
  }

  /**
   * Get the current page object
   *
   * @returns Current page or null if not loaded
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Get current session information
   *
   * @returns Current session or null
   */
  getSession(): BrowserSession | null {
    return this.session;
  }

  /**
   * Check if page is still active
   *
   * @returns true if page is active, false otherwise
   */
  isActive(): boolean {
    return this.session?.isActive ?? false;
  }

  /**
   * Get elapsed time since session started
   *
   * @returns Elapsed time in milliseconds
   */
  getElapsedTime(): number {
    if (!this.session) return 0;
    return Date.now() - this.session.startTime;
  }

  /**
   * Check if execution has exceeded timeout
   *
   * @returns true if timeout exceeded, false otherwise
   */
  isTimedOut(): boolean {
    return this.getElapsedTime() > this.timeout;
  }

  /**
   * Clean up browser resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.stagehand) {
        await this.stagehand.close();
        this.stagehand = null;
      }

      if (this.session) {
        this.session.isActive = false;
      }

      console.log('✓ Browser resources cleaned up');
    } catch (error) {
      console.error(
        `Error during cleanup: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get page title
   *
   * @returns Page title or empty string
   */
  async getPageTitle(): Promise<string> {
    if (!this.page) return '';
    return await this.page.title();
  }

  /**
   * Get current URL
   *
   * @returns Current URL or empty string
   */
  async getCurrentUrl(): Promise<string> {
    if (!this.page) return '';
    return this.page.url();
  }
}
