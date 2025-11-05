/**
 * Hash utilities for consistent hashing across the codebase
 */

/**
 * Generate a simple hash string from input
 * Uses FNV-like algorithm for consistency across the app
 *
 * @param str - String to hash
 * @returns Hexadecimal hash string
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Generate a hash number from input (legacy compatibility)
 * @deprecated Use simpleHash() instead
 *
 * @param str - String to hash
 * @returns Hash as positive number
 */
export function hashAsNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
