/**
 * Error Handler Utility Module
 *
 * Provides consistent, user-friendly error messages with actionable hints
 */

export class QAError extends Error {
  constructor(
    message: string,
    public code: string,
    public hint?: string,
    public troubleshooting?: string[]
  ) {
    super(message);
    this.name = 'QAError';
  }
}

export const ErrorCodes = {
  // Configuration errors
  CONFIG_MISSING_API_KEY: 'CONFIG_MISSING_API_KEY',
  CONFIG_INVALID_URL: 'CONFIG_INVALID_URL',
  CONFIG_INVALID_TIMEOUT: 'CONFIG_INVALID_TIMEOUT',

  // Browser errors
  BROWSER_INIT_FAILED: 'BROWSER_INIT_FAILED',
  BROWSER_CONNECTION_FAILED: 'BROWSER_CONNECTION_FAILED',
  BROWSER_PAGE_CRASH: 'BROWSER_PAGE_CRASH',
  BROWSER_TIMEOUT: 'BROWSER_TIMEOUT',

  // Game interaction errors
  ACTION_FAILED: 'ACTION_FAILED',
  ACTION_TIMEOUT: 'ACTION_TIMEOUT',
  GAME_NOT_RESPONSIVE: 'GAME_NOT_RESPONSIVE',

  // Evidence capture errors
  SCREENSHOT_FAILED: 'SCREENSHOT_FAILED',
  CONSOLE_CAPTURE_FAILED: 'CONSOLE_CAPTURE_FAILED',
  FILE_WRITE_FAILED: 'FILE_WRITE_FAILED',

  // LLM/Evaluation errors
  LLM_API_FAILED: 'LLM_API_FAILED',
  LLM_RESPONSE_INVALID: 'LLM_RESPONSE_INVALID',
  EVALUATION_TIMEOUT: 'EVALUATION_TIMEOUT',

  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
};

export function createError(
  message: string,
  code: string,
  hint?: string,
  troubleshooting?: string[]
): QAError {
  return new QAError(message, code, hint, troubleshooting);
}

export function handleError(error: unknown): string {
  if (error instanceof QAError) {
    let output = `❌ ${error.message}\n`;
    if (error.hint) {
      output += `💡 Hint: ${error.hint}\n`;
    }
    if (error.troubleshooting && error.troubleshooting.length > 0) {
      output += `🔧 Troubleshooting:\n`;
      error.troubleshooting.forEach((step, i) => {
        output += `   ${i + 1}. ${step}\n`;
      });
    }
    return output;
  }

  if (error instanceof Error) {
    return `❌ ${error.message}`;
  }

  return `❌ An unexpected error occurred: ${String(error)}`;
}

/**
 * Common error factories with helpful messages
 */

export const ErrorTemplates = {
  missingApiKey: (service: string) =>
    createError(
      `Missing API key for ${service}`,
      ErrorCodes.CONFIG_MISSING_API_KEY,
      `${service} requires authentication via API key`,
      [
        `Set the ${service}_API_KEY environment variable`,
        `Check your .env file exists and is properly formatted`,
        `Ensure you have a valid API key from ${service}`,
        `Verify the .env file has no trailing spaces in values`,
      ]
    ),

  invalidUrl: (url: string) =>
    createError(
      `Invalid or malformed URL: "${url}"`,
      ErrorCodes.CONFIG_INVALID_URL,
      `The URL must be a valid web address starting with http:// or https://`,
      [
        `Check the URL spelling and format`,
        `Ensure URL includes protocol (https://...)`,
        `Verify the domain name is correct`,
        `Try opening the URL in your browser manually to verify it works`,
      ]
    ),

  browserInitFailed: (reason: string) =>
    createError(
      `Failed to initialize browser: ${reason}`,
      ErrorCodes.BROWSER_INIT_FAILED,
      `Browser automation requires proper setup and credentials`,
      [
        `Verify Browserbase API key is set in .env`,
        `Check internet connection is working`,
        `Try running another simple test to isolate the issue`,
        `Check Browserbase service status`,
      ]
    ),

  pageLoadTimeout: (url: string, timeoutMs: number) =>
    createError(
      `Page failed to load within ${timeoutMs}ms: ${url}`,
      ErrorCodes.BROWSER_TIMEOUT,
      `The game URL took too long to respond`,
      [
        `Check if the URL is actually working (try in browser)`,
        `The server may be down or slow`,
        `Try increasing the timeout with --timeout option`,
        `Check your internet connection`,
      ]
    ),

  llmApiError: (service: string, status: string) =>
    createError(
      `${service} API error: ${status}`,
      ErrorCodes.LLM_API_FAILED,
      `LLM evaluation service is unavailable`,
      [
        `Check ${service} service status online`,
        `Verify your ${service} API key is valid and has credits`,
        `Check your internet connection`,
        `Try again in a few moments`,
      ]
    ),

  gameNotFound: (url: string) =>
    createError(
      `Game page returned 404 or is not accessible: ${url}`,
      ErrorCodes.CONFIG_INVALID_URL,
      `The URL does not point to a valid, accessible game`,
      [
        `Verify the URL is correct`,
        `Try opening the URL in your browser to confirm it's working`,
        `Check if the game site requires authentication`,
        `Ensure you have network access to the game server`,
      ]
    ),

  screenshotFailed: (reason: string) =>
    createError(
      `Failed to capture screenshot: ${reason}`,
      ErrorCodes.SCREENSHOT_FAILED,
      `Screenshot capture encountered an issue`,
      [
        `Check that output directory is writable`,
        `Verify you have disk space available`,
        `Check file permissions on the output directory`,
        `Try running with a different output directory`,
      ]
    ),

  actionFailed: (action: string, reason: string) =>
    createError(
      `Game action failed: ${action} - ${reason}`,
      ErrorCodes.ACTION_FAILED,
      `The interaction with the game did not work as expected`,
      [
        `The game may not be responding to that action type`,
        `Verify the game has loaded completely before interaction`,
        `Try a different action type`,
        `Check the game's documentation for supported inputs`,
      ]
    ),
};
