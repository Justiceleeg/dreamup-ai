# DreamUp QA Pipeline

An autonomous AI agent for testing browser-based games with visual evidence capture and intelligent playability assessment.

## 🎮 Overview

DreamUp QA Pipeline is designed to automatically test web-based games by:

1. **Loading games** in a headless browser via Browserbase
2. **Simulating interactions** using AI-powered browser automation (Stagehand)
3. **Capturing evidence** (screenshots, console logs)
4. **Analyzing playability** using LLM evaluation
5. **Generating reports** with structured results and recommendations

This enables rapid feedback loops for game developers and AI game-building agents.

## ⚠️ Runtime Requirement

**This project requires Node.js 18+**

The project uses Stagehand (built on Playwright) for browser automation, which only supports Node.js at this time.

See [CLAUDE.md](./CLAUDE.md) for more details.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm
- Browserbase API Key (free tier available)
- LLM API Key (OpenAI, Anthropic, or Google)

### Installation

```bash
# Install dependencies
pnpm install
# (or npm install if you prefer)

# Configure environment variables
# Edit .env and add your API keys
```

### Running Your First Test

```bash
# Option 1: Using the qa-agent script (recommended)
npx tsx qa-agent https://example.com/game

# Option 2: Using src/index.ts directly
npx tsx src/index.ts https://example.com/game

# Option 3: With pnpm
pnpm dlx tsx qa-agent https://example.com/game
```

## 📖 Documentation

- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Setup and configuration
- **[CLAUDE.md](./CLAUDE.md)** - Runtime requirements
- **[src/README.md](./src/README.md)** - Architecture and module structure
- **[docs/LAYER1_SUMMARY.md](./docs/LAYER1_SUMMARY.md)** - Implementation history
- **[docs/TEST_RESULTS.md](./docs/TEST_RESULTS.md)** - Test validation

## 🎯 Current Status

**Layers 1-5: Core System** ✅ Complete and Functional

### Layer 1: Foundation ✅
- ✅ TypeScript project setup
- ✅ Browserbase & Stagehand integration
- ✅ Screenshot capture system

### Layer 2: Interaction ✅
- ✅ Stagehand V3 integration with Browserbase
- ✅ AI-powered action detection and execution
- ✅ Keyboard (Space, Enter, Arrow keys, WASD) and click actions
- ✅ Game state change detection via screenshot comparison
- ✅ Action history tracking and retry logic

### Layer 3: Evidence ✅
- ✅ Multi-screenshot capture (3-5 per test)
- ✅ Console log capture and analysis
- ✅ Structured file organization
- ✅ Manifest generation with metadata

### Layer 4: AI Evaluation ✅
- ✅ OpenAI Vision API integration (game analysis)
- ✅ GPT-4o playability assessment
- ✅ Playability score calculation (0-100)
- ✅ Issue identification and severity classification
- ✅ Fallback scoring on API failures

### Layer 5: Output & API ✅
- ✅ JSON report generation with full schema
- ✅ CLI interface with options (timeout, screenshots, output dir)
- ✅ Programmatic API (testGame function)

### Validated Features
- ✅ 2048 Game: Arrow keys working, state changes detected (90-95/100 score)
- ✅ Pac-Man Game: Space key working (95/100 score)
- ✅ Game Analysis: Vision API identifying game controls with 100% confidence
- ✅ Screenshot Comparison: Detecting game state changes from tiles merging, position changes

## 💻 Usage

```bash
# Basic usage
npx tsx qa-agent https://example.com/game

# With options
npx tsx qa-agent https://example.com/game \
  --timeout 300000 \
  --screenshots 5 \
  --output ./test-results \
  --headed
```

## ⚙️ Edge Cases & Robustness

The system has been tested against various edge cases and handles failures gracefully:

### Tested Edge Cases

1. **HTTP Error Pages (404, 500)**
   - System correctly identifies error pages as non-games
   - Returns error status with playability score 0-30/100
   - Still captures artifacts (screenshots, console logs) for debugging

2. **Non-Game Websites (Google, Wikipedia)**
   - Correctly differentiates between games and regular websites
   - Detects unresponsive controls and low engagement
   - Scores appropriately (10-15/100)

3. **API Failures (Invalid OpenAI Key)**
   - Falls back to heuristic scoring when LLM evaluation fails
   - Still generates full JSON report with fallback assessment
   - Includes confidence scores showing limitations

4. **Timeout & Resource Exhaustion**
   - Gracefully handles total execution timeouts (120s default)
   - Individual action timeouts prevent infinite loops
   - Partial results returned even on timeout

### Graceful Degradation

- **Observation Errors**: System continues even if Stagehand observation fails
- **Screenshot Failures**: Captures best-effort evidence; continues on capture errors
- **API Failures**: Falls back to heuristic scoring with low confidence flags
- **Network Issues**: Retry logic with exponential backoff for page loads

### Test Results Structure

Even on failure, complete test artifacts are saved:
```
test-results/{gameId}/{timestamp}/
├── screenshot-000.png        (Initial state)
├── screenshot-001.png        (After interactions)
├── screenshot-002.png        (Final state)
├── console.log              (Browser console output)
├── manifest.json            (Metadata and artifact list)
└── result.json              (Full JSON report)
```

## 🔧 Troubleshooting

### Common Issues

#### "Missing API key for Browserbase"
```bash
# Solution: Set your Browserbase API key
export BROWSERBASE_API_KEY="your-api-key-here"

# Or add to .env file
echo "BROWSERBASE_API_KEY=your-api-key-here" >> .env
```
Get a free Browserbase account at: https://www.browserbase.com

#### "Missing API key for OpenAI"
```bash
# Solution: Set your OpenAI API key
export OPENAI_API_KEY="sk-..."

# Or add to .env file
echo "OPENAI_API_KEY=sk-..." >> .env
```
Get an API key at: https://platform.openai.com/account/api-keys

#### "Test execution exceeded 120000ms timeout"
- The game took too long to load or respond
- Try increasing the timeout: `--timeout 300000` (5 minutes)
- Check if the game URL is working in your browser
- Verify your internet connection

#### "Failed to initialize browser"
- Verify Browserbase is reachable (check service status)
- Check your API credentials are correct
- Try again in a moment (may be temporary issue)

#### "Page error / Game crashed"
- Check browser console for JavaScript errors
- The game may have compatibility issues with Playwright/Browserbase
- Try testing a different game to isolate the issue

### Debug Mode

Run with detailed logging:
```bash
# Show all Stagehand logs
DEBUG=* pnpm dlx tsx ./src/index.ts https://example.com/game

# Increase screenshot count for more visibility
pnpm dlx tsx ./src/index.ts https://example.com/game --screenshots 10
```

## 📊 Output Format

### JSON Report Structure

Each test generates a JSON report with:

```json
{
  "status": "pass|fail|error",
  "gameUrl": "https://...",
  "playability_score": 0-100,
  "confidence": 0-100,
  "execution_time_ms": 12345,
  "issues": [
    {
      "type": "crash|unresponsive|load_failure|rendering|other",
      "severity": "critical|major|minor",
      "description": "..."
    }
  ],
  "screenshots": ["path/to/screenshot.png", ...],
  "console_logs": "path/to/console.log",
  "metadata": {
    "actions_performed": 5,
    "screens_navigated": 2,
    "screenshots_captured": 5,
    "browser_errors": 0,
    "agent_version": "2.0.0",
    "evaluation_reasoning": "...",
    "objective_metrics": {
      "control_response_rate": 100,
      "successful_actions": 5,
      "total_actions_attempted": 5,
      "intermediate_screenshots": 3
    }
  }
}
```

### Playability Score Calculation

- **0-30/100**: Game not playable (crashes, doesn't load, unresponsive)
- **30-60/100**: Game playable with issues (slow, occasional crashes, poor controls)
- **60-80/100**: Game mostly playable (minor issues, good responsiveness)
- **80-100/100**: Game fully playable (stable, responsive, no major issues)

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Entry Point                      │
│                        (src/index.ts)                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Test Game     │
                    │ (core/index.ts) │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼────┐      ┌──────▼─────┐      ┌────▼──────┐
    │ Browser  │      │ Evidence   │      │Game       │
    │ Agent    │      │ Capture    │      │Interactor │
    │          │      │            │      │           │
    │ Manages  │      │ Captures:  │      │ Performs: │
    │ - Init   │      │ - Screenshots    │ - Observ. │
    │ - Nav    │      │ - Console logs   │ - Actions │
    │ - Close  │      │ - Manifest       │ - Detect  │
    └─────┬────┘      └──────┬─────┘      └────┬──────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  AI Evaluator   │
                    │ (LLM Analysis)  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Report Generator│
                    │  (JSON Output)  │
                    └─────────────────┘
```

### Key Modules

| Module | Purpose | Location |
|--------|---------|----------|
| **BrowserAgent** | Browser lifecycle management | `src/browser/browser-agent.ts` |
| **EvidenceCapture** | Evidence artifact collection | `src/evidence/evidence-capture.ts` |
| **ImprovedGameInteractor** | Game interaction & state detection | `src/interaction/improved-game-interactor.ts` |
| **AIEvaluator** | LLM-based playability assessment | `src/evaluation/ai-evaluator.ts` |
| **ErrorHandler** | Consistent error formatting | `src/shared/error-handler.ts` |
| **Types** | TypeScript interfaces & schemas | `src/shared/types.ts` |

### Data Flow

1. **Load Phase**
   - Browser initializes with Browserbase
   - Game URL loaded in headless browser
   - Initial screenshot captured
   - Console capture hooks set up

2. **Interaction Phase**
   - Stagehand analyzes page for interactive elements
   - Actions (clicks, keys) executed with state monitoring
   - Screenshots captured at key moments
   - State changes detected via screenshot comparison

3. **Evaluation Phase**
   - Evidence (screenshots, logs, metrics) collected
   - GPT-4o analyzes playability
   - Playability score calculated (0-100)
   - Issues and recommendations generated

4. **Reporting Phase**
   - Results formatted as JSON
   - Artifacts organized with manifest
   - Report saved to disk

### How the Testing Loop Works

The DreamUp QA Pipeline uses a **cycle-based interaction model** to autonomously test games:

1. **Observe → Act → Observe → Analyze** Cycle
   - **Observe:** Stagehand analyzes the page DOM to detect interactive elements (buttons, clickable areas)
   - **Act:** Executes detected actions (clicks, keyboard inputs) to simulate player interaction
   - **Observe:** Takes screenshots and monitors for state changes
   - **Analyze:** Detects if the game state changed (different pixels, new UI elements, etc.)
   - **Repeat:** Continues until timeout or game completion is detected

2. **State Detection Strategy**
   - Captures screenshots after each action to establish a baseline
   - Compares consecutive screenshots to detect visual changes
   - Uses pixel-level comparison to identify game progression (tiles merging, positions changing, UI updates)
   - Monitors console logs for crash indicators and error messages

3. **Safety Mechanisms**
   - **Global Timeout:** 5-minute maximum per test (configurable)
   - **Action Limit:** Maximum 50 actions to prevent infinite loops
   - **State Loop Detection:** Stops if the same screenshot appears 3 times consecutively
   - **Error Monitoring:** Tracks browser console for critical errors

### AI-Powered Playability Analysis

The system uses **Vercel AI SDK** with vision-capable LLMs (GPT-4o, Claude 3.5 Sonnet, Gemini) to intelligently analyze game playability:

**Evidence Submission:**
- Sends 3-5 timestamped screenshots showing game progression
- Includes browser console logs (errors, warnings) for context
- Provides objective metrics (action response rate, state changes detected)

**Evaluation Criteria (via LLM):**
- **Successful Load:** Is the game canvas visible and properly rendered?
- **Responsive Controls:** Do user inputs (clicks, keys) produce visible state changes?
- **Stability:** Are there crashes, freezes, or critical console errors?

**Playability Scoring:**
- LLM analyzes visual evidence and log data to generate a 0-100 score
- Confidence score (0-100) indicates certainty in the assessment
- Fallback heuristics apply if LLM fails (uses console error count + screenshot analysis)

**Example Analysis Output:**
```
Screenshots analyzed: 5 images showing game progression
Console logs: 0 errors detected
Control response rate: 100% (5/5 actions caused visible changes)

LLM Assessment:
- successful_load: true ✓
- responsive_controls: true ✓
- stable: true ✓
- playability_score: 92/100
- confidence: 95/100

Issues found: None critical
Recommendations: Minor UI polish suggested
```

This combination of **visual evidence** (screenshots), **behavioral metrics** (action response rates), and **intelligent analysis** (LLM evaluation) ensures accurate playability assessments that would be difficult with purely automated or manual approaches.

## 📋 Known Limitations

### Browser & Environment
- **Browserbase Remote Browsers**: Some JavaScript console events may not be exposed
- **Heavy Games**: Games with intensive graphics may timeout or crash
- **Native Code**: Games using WebAssembly extensively may have limited compatibility
- **Authentication Required**: Games requiring login will likely fail

### Game Types
- **Games with CAPTCHAs**: Cannot be tested automatically
- **Real-time Multiplayer**: May fail due to network/server issues
- **Cloud-based Games**: Streaming games (e.g., GFXBench) are not testable

### Detection & Analysis
- **Console Logs**: May be empty on production games or in Browserbase remote environments
- **State Detection**: Based on visual changes; invisible logic changes won't be detected
- **Control Detection**: Detects visible UI elements; hidden or dynamically created controls may be missed
- **Timing**: 30-second test window may be insufficient for complex game tutorials

### LLM Limitations
- **Inconsistent Analysis**: LLM judgments may vary based on prompt formatting
- **Context Limits**: Large numbers of images may exceed token limits
- **Cost**: Each test incurs LLM API costs

## 🎬 CLI Options

```bash
npx tsx ./src/index.ts <gameUrl> [options]

Options:
  --timeout <ms>          Maximum test duration in milliseconds (default: 300000)
  --screenshots <count>   Number of screenshots to capture (default: 5)
  --output <dir>          Output directory for results (default: ./test-results)
  --headed                Run browser in headed mode for debugging
```

## 📚 More Information

For detailed documentation, see:
- Setup: [GETTING_STARTED.md](./GETTING_STARTED.md)
- Runtime: [CLAUDE.md](./CLAUDE.md)
- Status: [LAYER1_SUMMARY.md](./LAYER1_SUMMARY.md)
