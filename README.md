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
# Test a game
pnpm dlx tsx ./src/index.ts https://example.com/game
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
# Test a game
pnpm dlx tsx ./src/index.ts https://example.com/game

# With options
pnpm dlx tsx ./src/index.ts https://example.com/game \
  --timeout 300000 \
  --screenshots 5 \
  --output ./test-results
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

## 📚 More Information

For detailed documentation, see:
- Setup: [GETTING_STARTED.md](./GETTING_STARTED.md)
- Runtime: [CLAUDE.md](./CLAUDE.md)
- Status: [LAYER1_SUMMARY.md](./LAYER1_SUMMARY.md)
