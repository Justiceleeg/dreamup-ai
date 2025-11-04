# DreamUp QA Pipeline - Source Code Structure

## Overview

```
src/
├── core/                    # Main pipeline orchestration
│   └── index.ts            # Main entry point and CLI
│
├── browser/                # Browser automation & control
│   └── browser-agent.ts    # Stagehand initialization and page loading
│
├── game-analysis/          # Game understanding & intelligence
│   ├── game-analyzer.ts    # Analyzes game mechanics and controls (HTML + vision)
│   └── action-set-builder.ts # Builds intelligent action sets from game analysis
│
├── interaction/            # Game interaction & execution
│   ├── action-orchestrator.ts  # Low-level action execution (observe→act→wait cycle)
│   └── improved-game-interactor.ts # High-level interaction with retry logic & state detection
│
├── detection/              # State & change detection
│   └── state-change-detector.ts # Screenshot comparison and state change detection
│
├── evidence/               # Test artifacts & logging
│   └── evidence-capture.ts # Screenshot and console log capture
│
├── evaluation/             # AI evaluation
│   └── ai-evaluator.ts     # Game playability assessment with GPT-4
│
└── shared/                 # Shared types & interfaces
    └── types.ts            # Core type definitions used across modules
```

## Module Dependencies

```
core/index.ts
├── browser/browser-agent.ts
├── evidence/evidence-capture.ts
├── interaction/action-orchestrator.ts (legacy)
└── evaluation/ai-evaluator.ts

interaction/improved-game-interactor.ts (recommended)
├── game-analysis/game-analyzer.ts
├── game-analysis/action-set-builder.ts
├── detection/state-change-detector.ts
└── evidence/evidence-capture.ts

shared/types.ts (used by all modules)
```

## Module Responsibilities

### `core/` - Pipeline Orchestration
- Main entry point and CLI argument parsing
- Coordinates the entire test workflow
- Handles test results and error reporting

### `browser/` - Browser Automation
- Initializes Stagehand and Browserbase sessions
- Handles page navigation and basic browser control
- Provides page access patterns for Stagehand V3

### `game-analysis/` - Intelligent Game Understanding
- **GameAnalyzer**: Determines what game is loaded and how to interact with it
  - Fast path: HTML analysis for visible instructions
  - Fallback: OpenAI GPT-4V vision API for accurate analysis
  - Returns: game name, keyboard keys, mouse actions, controls

- **ActionSetBuilder**: Creates prioritized list of actions to try
  - Prioritizes actions: start keys → movement → actions → mouse → waits
  - Includes action variations for retry logic
  - Optimized action set based on game analysis

### `interaction/` - Game Interaction
- **ActionOrchestrator** (legacy): Low-level observe→act→wait cycle
  - Canvas game detection
  - DOM element observation with Stagehand

- **ImprovedGameInteractor** (recommended): High-level intelligent interaction
  - Uses game analysis for smart actions
  - Retry logic with action variations
  - State change detection
  - Tracks action history and failures

### `detection/` - State & Change Detection
- **StateChangeDetector**: Compares screenshots to detect game state changes
  - Hash-based comparison
  - Confidence scoring
  - Progression tracking across multiple actions

### `evidence/` - Test Artifacts
- **EvidenceCapture**: Captures and organizes test artifacts
  - Screenshots (PNG files)
  - Console logs
  - Metadata manifests
  - Handles both local and remote (Browserbase) screenshot writing

### `evaluation/` - AI Game Evaluation
- **AIEvaluator**: Assesses game playability using AI
  - Evaluates: load success, control responsiveness, stability
  - Generates playability score (0-100) and confidence level
  - Identifies issues and recommends fixes

### `shared/` - Shared Definitions
- **types.ts**: Core interfaces used across all modules
  - Action, ActionResult
  - PageState
  - QAConfig, TestResult
  - Issue, TestMetadata
  - BrowserSession
  - LLMEvaluation

## Data Flow

```
┌─────────────────────┐
│  CLI Input: URL     │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────┐
│ browser-agent           │
│ - Initialize Stagehand  │
│ - Load game URL         │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ evidence-capture         │
│ - Capture initial screen │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ game-analyzer            │
│ - Analyze game mechanics │
│ - Determine controls     │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ action-set-builder       │
│ - Build action set       │
│ - Prioritize actions     │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ improved-game-interactor │
│ Loop:                    │
│ - Execute action         │
│ - Capture screenshot     │
│ - Detect state change    │
│ - Retry if needed        │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ ai-evaluator             │
│ - Assess playability     │
│ - Generate report        │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ CLI Output: TestResult   │
│ (JSON with scores)       │
└──────────────────────────┘
```

## Usage

### Running the Pipeline
```bash
npx tsx ./src/core/index.ts "https://example.com/game"
```

### Key Features
1. **Intelligent Game Analysis**: Automatically determines game type and controls
2. **Retry Logic**: Tries action variations when actions fail
3. **State Detection**: Knows when game state changes
4. **Screenshot Capture**: Handles local and remote browsers
5. **AI Evaluation**: Comprehensive playability assessment

## Future Enhancements
- [ ] Image-based action execution (pass screenshots to AI for visual feedback)
- [ ] Machine learning-based action prediction
- [ ] Multi-tab game support
- [ ] Custom plugin system for specific game types
- [ ] Performance profiling and metrics
