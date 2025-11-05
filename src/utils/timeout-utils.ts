/**
 * Timeout utilities for managing operation timeouts
 * Wraps promises with timeout guards to prevent hanging operations
 */

export class TimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`Operation "${operation}" exceeded timeout of ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Wrap a promise with a timeout
 * If the promise doesn't resolve within the timeout, it will reject with TimeoutError
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name of the operation (for error messages)
 * @returns Promise that resolves or rejects (with timeout) whichever comes first
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string = 'operation'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(operationName, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Wrap a function execution with a timeout
 * Useful for async functions that might hang
 *
 * @param fn - Async function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name of the operation
 * @returns Promise that resolves or rejects (with timeout) whichever comes first
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  operationName: string = 'operation'
): Promise<T> {
  return withTimeout(fn(), timeoutMs, operationName);
}

/**
 * Standard timeout values for different operations
 * Tuned for AI agent operations
 */
export const OPERATION_TIMEOUTS = {
  // Stagehand operations
  STAGEHAND_ACT: 20_000, // 20 seconds - actual action execution
  STAGEHAND_OBSERVE: 10_000, // 10 seconds - finding interactive elements

  // Interaction loop
  INTERACTION_LOOP: 20_000, // 20 seconds - single interaction cycle

  // AI operations
  AI_EVALUATION: 90_000, // 90 seconds - GPT-4V vision analysis

  // Overall test
  OVERALL_TEST: 120_000, // 2 minutes - entire test execution
} as const;

export type OperationTimeoutKey = keyof typeof OPERATION_TIMEOUTS;

/**
 * Get timeout value for an operation
 * @param operation - The operation key
 * @returns Timeout in milliseconds
 */
export function getTimeout(operation: OperationTimeoutKey): number {
  return OPERATION_TIMEOUTS[operation];
}
