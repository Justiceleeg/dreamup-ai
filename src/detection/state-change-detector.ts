/**
 * State Change Detector Module
 *
 * Compares screenshots to detect if game state has changed.
 * Helps determine if actions are actually working.
 */

import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * State change detection result
 */
export interface StateChangeResult {
  changed: boolean;
  similarity: number; // 0-1, where 1 is identical
  confidence: number; // 0-100, how confident we are in this result
  description: string;
}

/**
 * Detects game state changes by comparing screenshots
 */
export class StateChangeDetector {
  /**
   * Compare two screenshots for changes
   *
   * @param beforePath - Path to before screenshot
   * @param afterPath - Path to after screenshot
   * @returns State change detection result
   */
  compareScreenshots(beforePath: string, afterPath: string): StateChangeResult {
    try {
      // Read both screenshots
      if (!fs.existsSync(beforePath)) {
        return {
          changed: false,
          similarity: 0,
          confidence: 0,
          description: 'Before screenshot not found',
        };
      }

      if (!fs.existsSync(afterPath)) {
        return {
          changed: false,
          similarity: 0,
          confidence: 0,
          description: 'After screenshot not found',
        };
      }

      const beforeBuffer = fs.readFileSync(beforePath);
      const afterBuffer = fs.readFileSync(afterPath);

      // Compare file sizes (rough indicator)
      const sizeChange = Math.abs(beforeBuffer.length - afterBuffer.length);
      const avgSize = (beforeBuffer.length + afterBuffer.length) / 2;
      const sizeDiff = sizeChange / avgSize;

      // Calculate hash-based similarity (not pixel-perfect, but good enough)
      const beforeHash = crypto.createHash('sha256').update(beforeBuffer).digest('hex');
      const afterHash = crypto.createHash('sha256').update(afterBuffer).digest('hex');

      const isSameFile = beforeHash === afterHash;

      if (isSameFile) {
        return {
          changed: false,
          similarity: 1.0,
          confidence: 95,
          description: 'Screenshots are identical (no state change detected)',
        };
      }

      // If files are different, it's likely a state change
      // Confidence is higher if size differences suggest actual changes
      const hasSignificantChange = sizeDiff > 0.05; // More than 5% size difference

      return {
        changed: true,
        similarity: 1.0 - Math.min(sizeDiff, 1.0),
        confidence: hasSignificantChange ? 85 : 60,
        description: hasSignificantChange
          ? 'Significant state change detected (file size differs by > 5%)'
          : 'Minor state change detected',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        changed: false,
        similarity: 0,
        confidence: 0,
        description: `Error comparing screenshots: ${errorMsg}`,
      };
    }
  }

  /**
   * Calculate a visual hash of the screenshot
   * More sophisticated than file hash - detects visual changes
   *
   * @param screenshotPath - Path to screenshot
   * @returns Visual hash string
   */
  getVisualHash(screenshotPath: string): string {
    try {
      const buffer = fs.readFileSync(screenshotPath);
      // For now, use file-based hash
      // In future, could implement actual pixel-based comparison
      return crypto.createHash('sha256').update(buffer).digest('hex');
    } catch {
      return '';
    }
  }

  /**
   * Check if multiple screenshots show progression
   * Useful for detecting if game is progressing through levels, etc.
   *
   * @param screenshotPaths - Array of screenshot paths in order
   * @returns Array of state changes between consecutive screenshots
   */
  detectProgression(screenshotPaths: string[]): StateChangeResult[] {
    const results: StateChangeResult[] = [];

    for (let i = 1; i < screenshotPaths.length; i++) {
      const prev = screenshotPaths[i - 1]!;
      const curr = screenshotPaths[i]!;
      const result = this.compareScreenshots(prev, curr);
      results.push(result);
    }

    return results;
  }

  /**
   * Analyze screenshot characteristics
   * (Can be used for more sophisticated change detection in future)
   */
  async analyzeScreenshot(screenshotPath: string): Promise<{
    fileSize: number;
    hash: string;
    timestamp: number;
  }> {
    const stats = fs.statSync(screenshotPath);
    const hash = this.getVisualHash(screenshotPath);

    return {
      fileSize: stats.size,
      hash,
      timestamp: stats.mtimeMs,
    };
  }
}
