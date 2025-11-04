# Getting Started with DreamUp QA Pipeline

## Overview

DreamUp QA Pipeline is an autonomous AI agent for testing browser-based games. It loads games in a headless browser, simulates user interactions, captures visual evidence, and uses LLM analysis to evaluate playability.

## Prerequisites

- **Node.js 18+** - JavaScript runtime (required for Playwright/Stagehand)
- **npm** - Package manager
- **Browserbase API Key** - For managed browser infrastructure
- **LLM API Key** - Anthropic (Claude), OpenAI (GPT-4V), or Google (Gemini)

> **Note:** This project requires Node.js because Stagehand (browser automation) depends on Playwright, which doesn't support Bun yet. See [CLAUDE.md](./CLAUDE.md) for details.

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

(Alternatively, you can use `npm install`, but pnpm is faster and more reliable)

### 2. Configure Environment

Edit `.env` file with your API credentials:

```bash
BROWSERBASE_API_KEY=your_key_here
BROWSERBASE_PROJECT_ID=your_project_id_here
ANTHROPIC_API_KEY=your_key_here  # or OPENAI_API_KEY / GOOGLE_API_KEY
```

### 3. Verify Installation

```bash
pnpm dlx tsx ./src/index.ts --help
```

You should see the help message with available options.

## Development

### Run in Development Mode

```bash
pnpm dlx tsx ./src/index.ts <url>
```

(or `npx tsx ./src/index.ts <url>` if you prefer npm)

### Run Tests

```bash
pnpm dlx tsx test-layer1.ts
```

(or `npx tsx test-layer1.ts` if you prefer npm)

## Usage

### Command Line

Test a single game:

```bash
pnpm dlx tsx ./src/index.ts https://example.com/game
```

With options:

```bash
pnpm dlx tsx ./src/index.ts https://example.com/game \
  --timeout 300000 \
  --screenshots 5 \
  --output ./test-results
```

### Programmatic API

```typescript
import { testGame } from './src/index.js';

const result = await testGame({
  gameUrl: 'https://example.com/game',
  timeout: 300000,
  screenshotCount: 5,
  outputDir: './test-results'
});

console.log(result);
```

## Project Structure

```
dreamup-qa/
├── src/
│   ├── index.ts              # Main entry point & CLI
│   ├── types.ts              # TypeScript type definitions
│   ├── orchestrator.ts        # Test coordinator
│   ├── browser-agent.ts       # Browser automation
│   ├── evidence-capture.ts    # Screenshot & log capture
│   ├── ai-evaluator.ts        # LLM integration
│   └── report-generator.ts    # JSON output formatting
├── test/                      # Unit tests
├── test-results/              # Test output (gitignored)
├── .env                       # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Next Steps

1. **Phase 1**: Implement basic browser control (layer1-2)
2. **Phase 2**: Add screenshot capture (layer1-3)
3. **Phase 3**: Implement Stagehand integration (layer2-1)
4. **Phase 4**: Add action sequencing (layer2-2)
5. **Phase 5**: Implement error handling (layer2-3)

For detailed development roadmap, see the MVP.md in `.taskmaster/docs/`.

## Troubleshooting

### Bun not found

Install Bun from https://bun.sh

### API key errors

Check that `.env` file exists and contains valid credentials.

### Module not found

Run `bun install` to ensure all dependencies are installed.

## Support

For questions or issues, refer to the main README.md or check `.taskmaster/docs/MVP.md` for the full specification.
