# DreamUp QA Pipeline - Delivery Package

## Overview

The DreamUp QA Pipeline is delivered as a **TypeScript source package** with no build step required. It uses Node.js with the `tsx` runtime loader to execute TypeScript directly.

## Delivery Method: Option 1 (No Build Step)

### Why This Approach?

- **No compilation required** - Faster iteration and debugging
- **Source transparency** - Users can inspect and modify code easily
- **Matches brief requirements** - "Typescript file is preferred (i.e. executed with `bun run qa.ts`, `npx tsx qa.ts`, etc.)"
- **Lambda compatible** - Can run directly in AWS Lambda Node.js 18+ runtime
- **Lower friction** - No dependency on build tools like webpack, esbuild, or Vite

### What's Included

```
dreamup-qa/
├── qa-agent              # CLI wrapper script (executable)
├── src/
│   ├── index.ts          # Alternative entry point
│   ├── core/
│   │   └── index.ts      # Main test orchestrator
│   ├── browser/
│   │   └── browser-agent.ts
│   ├── evidence/
│   │   └── evidence-capture.ts
│   ├── evaluation/
│   │   └── ai-evaluator.ts
│   ├── shared/
│   │   ├── types.ts
│   │   └── error-handler.ts
│   └── utils/
│       └── timeout-utils.ts
├── package.json          # Dependencies & bin entry
├── tsconfig.json         # TypeScript configuration (noEmit: true)
├── README.md             # User documentation
└── .env.example          # Environment template
```

## How to Use

### Installation

```bash
# Clone or download the repository
cd dreamup-qa

# Install dependencies
npm install
# or
pnpm install
```

### Basic Usage

```bash
# Using the qa-agent CLI wrapper
npx tsx qa-agent https://example.com/game

# Alternative: run src/index.ts directly
npx tsx src/index.ts https://example.com/game

# With options
npx tsx qa-agent https://example.com/game \
  --timeout 300000 \
  --screenshots 5 \
  --output ./test-results \
  --headed
```

### Configuration

Create a `.env` file with your API keys:

```bash
# Browserbase (required)
BROWSERBASE_API_KEY=your_api_key_here
BROWSERBASE_PROJECT_ID=your_project_id_here

# LLM Provider (choose one)
OPENAI_API_KEY=sk-...                    # For GPT-4o
# or
ANTHROPIC_API_KEY=sk-ant-...            # For Claude
# or
GOOGLE_API_KEY=...                       # For Gemini
```

## Runtime Requirements

- **Node.js 18+** (mandatory for Playwright/Stagehand)
- **npm or pnpm** (for dependency management)
- **Internet connection** (for Browserbase and LLM APIs)

## Output

Each test generates:

```
test-results/
└── {game-id}/
    └── {timestamp}/
        ├── screenshot-001.png
        ├── screenshot-002.png
        ├── screenshot-003.png
        ├── screenshot-004.png
        ├── screenshot-005.png
        ├── console.log
        ├── manifest.json
        └── result.json
```

The `result.json` contains:

```json
{
  "status": "pass|fail|error",
  "playability_score": 0-100,
  "confidence": 0-100,
  "issues": [
    {
      "type": "crash|unresponsive|load_failure|rendering|other",
      "severity": "critical|major|minor",
      "description": "..."
    }
  ],
  "screenshots": ["path/to/screenshot.png", ...],
  "console_logs": "path/to/console.log",
  "execution_time_ms": 12345,
  "metadata": {
    "actions_performed": 5,
    "screens_navigated": 2,
    "screenshots_captured": 5,
    "browser_errors": 0,
    "agent_version": "1.0.0",
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

## Integration Options

### As a CLI Tool

```bash
npx tsx qa-agent https://game.example.com
```

### Programmatically (Node.js)

```typescript
import { testGame } from './src/core/index.js';

const result = await testGame({
  gameUrl: 'https://example.com/game',
  timeout: 300000,
  screenshotCount: 5,
  outputDir: './test-results',
});

console.log(result.playability_score);
```

### In AWS Lambda

```typescript
import { testGame } from './dreamup-qa/src/core/index.js';

export const handler = async (event: any) => {
  const result = await testGame({
    gameUrl: event.gameUrl,
    timeout: 300000,
  });

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};
```

## Development vs. Production

### Development

```bash
# Run with debugging
npm run dev https://example.com/game

# Run with local game for testing
npx tsx qa-agent file:///path/to/local/game.html
```

### Production

No special setup needed. The same command works:

```bash
npx tsx qa-agent https://production-game.example.com
```

## Architecture

The system consists of **5 independent modules**:

1. **BrowserAgent** (`src/browser/browser-agent.ts`)
   - Manages Browserbase connection
   - Loads game URLs
   - Handles page navigation

2. **EvidenceCapture** (`src/evidence/evidence-capture.ts`)
   - Captures screenshots
   - Records console logs
   - Organizes artifacts

3. **GameInteractor** (`src/interaction/improved-game-interactor.ts`)
   - Detects game UI elements
   - Executes actions (clicks, keyboard)
   - Monitors for state changes

4. **AIEvaluator** (`src/evaluation/ai-evaluator.ts`)
   - Submits evidence to LLM
   - Generates playability scores
   - Creates issue reports

5. **ReportGenerator** (`src/shared/types.ts`)
   - Aggregates results
   - Generates JSON output
   - Validates schema

## Known Limitations

### Browser & Environment
- Some JavaScript console events may not be exposed in Browserbase remote browsers
- Heavy games with intensive graphics may timeout
- Games using WebAssembly extensively may have limited compatibility
- Games requiring authentication will fail

### Game Types
- Games with CAPTCHAs cannot be tested
- Real-time multiplayer games may fail due to network/server issues
- Cloud-based/streaming games are not testable

### Detection & Analysis
- Console logs may be empty on production games
- State detection based on visual changes only
- Invisible logic changes won't be detected
- Control detection may miss hidden or dynamically created elements

## Troubleshooting

### "Cannot find module '@browserbasehq/stagehand'"
```bash
npm install
```

### "Missing API key for Browserbase"
```bash
export BROWSERBASE_API_KEY="your-api-key-here"
# or add to .env file
```

### "Test execution exceeded timeout"
Increase the timeout:
```bash
npx tsx qa-agent <url> --timeout 600000  # 10 minutes
```

### "Failed to initialize browser"
Verify Browserbase is reachable and check API credentials.

## Support

For issues, questions, or feature requests:
- Check [README.md](./README.md) for documentation
- Review [CLAUDE.md](./CLAUDE.md) for runtime details
- Visit [Browserbase docs](https://docs.browserbase.com)
- Check [Stagehand documentation](https://docs.browserbase.com/stagehand)

## Version

**DreamUp QA Pipeline v1.0.0**

- Release Date: November 4, 2025
- Status: MVP Complete
- Last Updated: November 4, 2025
