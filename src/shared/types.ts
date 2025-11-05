/**
 * Core type definitions for DreamUp QA Pipeline
 */

/**
 * Represents a single action to be executed in the browser
 */
export interface Action {
  type: 'click' | 'type' | 'key' | 'wait';
  target?: string; // CSS selector or element identifier
  value?: string; // Text to type or key to press
  duration?: number; // Wait duration in milliseconds
  timestamp?: number; // When action was created
  result?: ActionResult;
}

/**
 * Result of executing an action
 */
export interface ActionResult {
  success: boolean;
  error?: string;
  executedAt?: number;
  duration?: number;
}

/**
 * Represents the state of a page at a point in time
 */
export interface PageState {
  url: string;
  title: string;
  timestamp: number;
  hash: string; // For detecting changes
  elements?: string[]; // Visible element selectors
  errors?: string[]; // Console errors at this point
}

/**
 * Configuration for QA test execution
 */
export interface QAConfig {
  gameUrl: string;
  timeout?: number;
  screenshotCount?: number;
  outputDir?: string;
  headed?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Result of a single game test
 */
export interface TestResult {
  status: 'pass' | 'fail' | 'error';
  gameUrl: string;
  playability_score: number; // 0-100
  confidence: number; // 0-100
  timestamp: string; // ISO8601
  execution_time_ms: number;
  issues: Issue[];
  screenshots: string[]; // File paths
  console_logs?: string; // File path
  metadata: TestMetadata;
}

/**
 * Represents an issue found during testing
 */
export interface Issue {
  type: 'crash' | 'unresponsive' | 'load_failure' | 'rendering' | 'other';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  detected_at_ms: number;
}

/**
 * Metadata about test execution
 */
export interface TestMetadata {
  game_title?: string;
  actions_performed: number;
  screens_navigated: number;
  browser_errors: number;
  agent_version: string;
  [key: string]: any;
}

/**
 * Browser session interface
 */
export interface BrowserSession {
  url: string;
  isActive: boolean;
  startTime: number;
}

/**
 * LLM Evaluation result
 */
export interface LLMEvaluation {
  successful_load: boolean;
  responsive_controls: boolean;
  stable: boolean;
  playability_score: number;
  confidence: number;
  issues: Array<{ type: string; severity: string; description: string }>;
  recommendations: string[];
  reasoning: string;
}
