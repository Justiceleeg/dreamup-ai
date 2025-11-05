/**
 * Unified logging utility for consistent output across the application
 * Provides structured logging with consistent emoji and formatting
 */

export interface LogContext {
  module?: string;
  action?: string;
  [key: string]: any;
}

/**
 * Logger utility for consistent console output across all modules
 */
export class Logger {
  private module: string;
  private isDev: boolean;

  constructor(module: string = 'App') {
    this.module = module;
    this.isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
  }

  /**
   * Log success message (✓)
   */
  success(message: string, context?: LogContext): void {
    this.log(`✓`, message, context);
  }

  /**
   * Log warning message (⚠)
   */
  warn(message: string, context?: LogContext): void {
    this.log(`⚠`, message, context, 'warn');
  }

  /**
   * Log error message (❌)
   */
  error(message: string, context?: LogContext): void {
    this.log(`❌`, message, context, 'error');
  }

  /**
   * Log info message (ℹ)
   */
  info(message: string, context?: LogContext): void {
    this.log(`ℹ`, message, context);
  }

  /**
   * Log debug message (🔍) - only in dev mode
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDev) {
      this.log(`🔍`, message, context);
    }
  }

  /**
   * Log target/action message (🎯)
   */
  action(message: string, context?: LogContext): void {
    this.log(`🎯`, message, context);
  }

  /**
   * Log state change message (↔)
   */
  stateChange(message: string, context?: LogContext): void {
    this.log(`↔`, message, context);
  }

  /**
   * Log detection message (🔎)
   */
  detection(message: string, context?: LogContext): void {
    this.log(`🔎`, message, context);
  }

  /**
   * Log analysis message (🧠)
   */
  analysis(message: string, context?: LogContext): void {
    this.log(`🧠`, message, context);
  }

  /**
   * Log capture message (📸)
   */
  capture(message: string, context?: LogContext): void {
    this.log(`📸`, message, context);
  }

  /**
   * Log skip/skip message (⏭)
   */
  skip(message: string, context?: LogContext): void {
    this.log(`⏭`, message, context);
  }

  /**
   * Internal method to format and output logs
   */
  private log(
    emoji: string,
    message: string,
    context?: LogContext,
    level: 'log' | 'warn' | 'error' = 'log'
  ): void {
    const timestamp = new Date().toISOString().substring(11, 19);
    const module = context?.module || this.module;
    const prefix = `[${timestamp}] ${emoji} [${module}]`;
    const output = `${prefix} ${message}`;

    // Add context information if provided
    const contextData = context ? { ...context } : null;
    delete (contextData as any)?.module;

    if (level === 'error') {
      console.error(output, contextData || '');
    } else if (level === 'warn') {
      console.warn(output, contextData || '');
    } else {
      console.log(output, contextData || '');
    }
  }
}

/**
 * Create a logger instance for a module
 * @param moduleName - Name of the module using the logger
 * @returns Logger instance
 */
export function createLogger(moduleName: string): Logger {
  return new Logger(moduleName);
}
