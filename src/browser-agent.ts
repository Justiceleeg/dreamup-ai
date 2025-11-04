/**
 * Browser Agent Module
 *
 * Handles browser initialization, page navigation, and interaction
 * using Stagehand 3.0.1 (V3) and Browserbase infrastructure.
 */

import { Stagehand } from '@browserbasehq/stagehand';
import type { BrowserSession } from './types.js';

/**
 * Browser Agent for controlling game interactions
 * Works with Stagehand 3.0.1 (V3) API
 */
export class BrowserAgent {
  private stagehand: Stagehand | null = null;
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

      // Initialize Stagehand V3 with Browserbase backend
      this.stagehand = new Stagehand({
        apiKey,
        projectId,
        env: 'BROWSERBASE',
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
   * @returns The Stagehand instance itself (which acts as the page in V3)
   */
  async loadGame(url: string): Promise<Stagehand> {
    if (!this.stagehand) {
      throw new Error('Browser not initialized. Call initializeBrowser() first.');
    }

    try {
      // Validate URL
      new URL(url);

      console.log(`🌐 Loading game from: ${url}`);

      // Set up session tracking
      this.session = {
        url,
        isActive: true,
        startTime: Date.now(),
      };

      console.log('✓ Page created');

      // Navigate to URL with timeout
      // In Stagehand V3, goto() is called directly on the instance
      await this.navigateWithTimeout(url);

      console.log('✓ Page loaded');
      return this.stagehand;
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
    if (!this.stagehand) {
      throw new Error('No Stagehand instance available for navigation');
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Navigation timeout after ${navigationTimeout}ms`)), navigationTimeout)
    );

    try {
      // In Stagehand V3, access page via context.pages()
      const pages = (this.stagehand as any).context?.pages?.();
      if (!pages || pages.length === 0) {
        throw new Error('No pages available in context');
      }

      const page = pages[0];
      const navigationPromise = page.goto(url, { waitUntil: 'domcontentloaded' });

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
   * Get the current Stagehand instance
   *
   * @returns Current Stagehand instance or null
   */
  getPage(): Stagehand | null {
    return this.stagehand;
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
    if (!this.stagehand) return '';
    try {
      const pages = (this.stagehand as any).context?.pages?.();
      if (!pages || pages.length === 0) return '';
      return await pages[0].title();
    } catch {
      return '';
    }
  }

  /**
   * Get current URL
   *
   * @returns Current URL or empty string
   */
  async getCurrentUrl(): Promise<string> {
    if (!this.stagehand) return '';
    try {
      const pages = (this.stagehand as any).context?.pages?.();
      if (!pages || pages.length === 0) return '';
      return pages[0].url();
    } catch {
      return '';
    }
  }
}
