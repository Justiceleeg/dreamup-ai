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
- **[LAYER1_SUMMARY.md](./LAYER1_SUMMARY.md)** - Implementation details
- **[TEST_RESULTS.md](./TEST_RESULTS.md)** - Test validation

## 🎯 Current Status

**Layer 1: Foundation** ✅ Complete and Tested

- ✅ Project setup with TypeScript
- ✅ Browser automation with Stagehand/Browserbase
- ✅ Screenshot capture and artifact management
- ✅ CLI interface
- ✅ 5/5 tests passing

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

## 📚 More Information

For detailed documentation, see:
- Setup: [GETTING_STARTED.md](./GETTING_STARTED.md)
- Runtime: [CLAUDE.md](./CLAUDE.md)
- Status: [LAYER1_SUMMARY.md](./LAYER1_SUMMARY.md)
