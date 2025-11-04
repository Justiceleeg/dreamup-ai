# Overview

DreamUp QA Pipeline is an autonomous AI agent that tests browser games by simulating user interactions, capturing visual evidence, and evaluating playability. This greenfield project will enable automated quality assurance for web-based games, ultimately supporting a self-improvement feedback loop for DreamUp's game-building agent.

## Problem Statement

DreamUp's game-building agent currently lacks automated validation mechanisms. Manual testing is time-consuming, inconsistent across game types, and unable to provide rapid feedback for agent iteration. We need an autonomous system that can test any browser game, detect issues, and provide structured feedback within minutes.

## Solution

An AI-powered QA agent that loads games in a headless browser, intelligently interacts with game controls, monitors for failures, and uses LLM analysis to generate comprehensive playability reports with visual evidence.

## Value Proposition

- **Enables automated self-improvement:** Creates feedback loops for game-building agent optimization
- **Scales quality assurance:** Tests games autonomously without manual intervention
- **Reduces iteration time:** Provides rapid feedback on game quality (< 6 minutes per test)
- **Demonstrates AI agent architecture:** Showcases production-ready autonomous systems

## Success Criteria

- Successfully tests 3+ diverse browser games end-to-end
- Achieves 80%+ accuracy on playability assessments (manually validated)
- Handles common failure modes gracefully (crashes, slow loads, rendering issues)
- Delivers clean, documented, modular codebase ready for iteration

# Core Features

## 1. Browser Automation Agent

**What it does:** Autonomously navigates and interacts with browser games using AI-powered automation.

**Why it's important:** The foundation of the QA pipeline—without reliable game interaction, we cannot assess playability.

**How it works:**
- Loads game URL in headless browser via Browserbase
- Uses Stagehand (AI-powered browser automation) to detect UI patterns (start buttons, menus, game over screens)
- Executes action sequences: clicks, keyboard inputs (arrow keys, spacebar), mouse movements
- Navigates through 2-3 game screens/levels when applicable
- Implements safety controls: 5-minute max execution time, retry logic for failed loads (up to 3 attempts)

**Key capabilities:**
- Detects common game controls without hardcoding patterns
- Adapts to different game types (puzzle, platformer, idle)
- Recognizes when game has crashed or frozen through page state monitoring

## 2. Evidence Capture System

**What it does:** Collects visual and diagnostic evidence during test execution.

**Why it's important:** Provides concrete artifacts for both LLM analysis and human review, enabling accurate playability assessment and debugging.

**How it works:**
- Captures 3-5 timestamped screenshots at key moments:
  - Initial load (baseline)
  - During gameplay interactions
  - End state or error state
- Records browser console logs (errors, warnings, info messages)
- Saves all artifacts to structured directory: `./test-results/{game-id}/{timestamp}/`
- Generates manifest file listing all captured evidence

**Output structure:**
```
test-results/
└── game-abc123/
    └── 2025-11-04T10-30-00/
        ├── screenshot-001.png
        ├── screenshot-002.png
        ├── screenshot-003.png
        ├── console.log
        └── manifest.json
```

## 3. AI Evaluation Engine

**What it does:** Analyzes captured evidence using LLM to assess game playability and identify issues.

**Why it's important:** Provides intelligent, context-aware evaluation that can understand visual and log-based signals—something traditional automated testing cannot do.

**How it works:**
- Submits screenshots and console logs to LLM (via Vercel AI SDK)
- Uses structured prompts to evaluate three key criteria:
  1. **Successful Load:** Is the game visible and properly rendered?
  2. **Responsive Controls:** Do user inputs cause expected changes?
  3. **Stability:** Did the game run without crashes or freezes?
- Generates structured output with:
  - Pass/fail status
  - Playability score (0-100)
  - Confidence score (0-100)
  - Specific issues found with descriptions
  - Recommendations for fixes
- Implements fallback heuristics if LLM call fails

**Evaluation criteria:**
- Visual: Game canvas is visible, UI elements render, state changes appear on screen
- Behavioral: Clicks/keystrokes produce reactions, game progresses through states
- Stability: No console errors, no blank screens, page remains responsive

## 4. Execution Interface

**What it does:** Provides simple, developer-friendly interface for running tests and consuming results.

**Why it's important:** Makes the system easy to integrate into automated workflows, Lambda functions, and manual testing scenarios.

**How it works:**
- **TypeScript execution:** `bun run qa.ts <game-url>` or `npx tsx qa.ts <game-url>`
- **CLI command:** `qa-agent <game-url>`
- **Programmatic API:** Import and call from Lambda functions
- Returns structured JSON output:

```json
{
  "status": "pass|fail|error",
  "playability_score": 85,
  "issues": [
    {
      "type": "crash|unresponsive|load_failure|rendering",
      "severity": "critical|major|minor",
      "description": "Detailed issue description"
    }
  ],
  "screenshots": ["path/to/screenshot1.png", "path/to/screenshot2.png"],
  "timestamp": "2025-11-04T10:30:00Z",
  "execution_time_ms": 245000
}
```

**Integration points:**
- Lambda-compatible (no GUI dependencies)
- Structured output for parsing by other systems
- File artifacts saved locally for review

# User Experience

## Primary User: DreamUp Game Developer Agent

The game developer agent is an AI system that generates browser games. It needs rapid, automated feedback on whether generated games are functional and playable.

**Key user flow:**
1. Agent generates a game and hosts it at a URL
2. Agent invokes QA pipeline: `qa-agent https://example.com/generated-game`
3. QA pipeline tests game and returns structured results within 5 minutes
4. Agent reviews results and iterates on game generation based on feedback

## Secondary User: Human Developer

Human developers need to manually test games or review QA results during development and debugging.

**Key user flow:**
1. Developer runs: `bun run qa.ts https://itch.io/some-game`
2. Watches terminal output for progress updates
3. Reviews generated JSON report
4. Opens screenshots in `test-results/` directory to visually inspect findings
5. Uses identified issues to guide fixes

## UI/UX Considerations

### Terminal Interface (MVP)
- Clear progress indicators during test execution
- Colored output for pass/fail status
- Summary statistics at completion
- File paths printed for easy access to artifacts

### Future Web Dashboard (v2.0)
- Real-time test progress visualization
- Screenshot gallery with timeline
- Filterable test history
- Comparative analysis across test runs
- Export reports as PDF/HTML

# Technical Architecture

## System Components

### 1. Test Orchestrator
**Responsibility:** Coordinates the entire test workflow from URL input to final report generation.

**Key functions:**
- Parse and validate input URL
- Initialize browser session
- Coordinate agent, capture, and evaluation modules
- Handle timeouts and retries
- Aggregate results and generate final report

### 2. Browser Agent Module
**Responsibility:** Interact with games in headless browser.

**Technology:** Browserbase (managed browser infrastructure) + Stagehand (AI-powered automation)

**Key functions:**
- Load game URL
- Detect interactive elements (buttons, controls)
- Execute action sequences (click, type, keyboard)
- Monitor page state changes
- Detect crashes and freezes

### 3. Evidence Capture Module
**Responsibility:** Collect visual and diagnostic artifacts.

**Key functions:**
- Take screenshots at strategic moments
- Capture console logs in real-time
- Save artifacts to file system with consistent naming
- Generate manifest of all captured evidence

### 4. AI Evaluator Module
**Responsibility:** Analyze evidence and generate playability assessment.

**Technology:** Vercel AI SDK (supports multiple LLM providers)

**Key functions:**
- Format evidence for LLM consumption
- Submit structured prompts
- Parse and validate LLM responses
- Calculate confidence scores
- Apply fallback heuristics if needed

### 5. Report Generator Module
**Responsibility:** Package findings into structured output.

**Key functions:**
- Aggregate data from all modules
- Generate JSON output conforming to schema
- Create human-readable summaries
- Link to visual artifacts

## Data Models

### Test Result Schema
```typescript
interface TestResult {
  status: 'pass' | 'fail' | 'error';
  playability_score: number; // 0-100
  game_url: string;
  timestamp: string; // ISO8601
  execution_time_ms: number;
  issues: Issue[];
  screenshots: string[]; // File paths
  console_logs: string; // File path
  metadata: TestMetadata;
}

interface Issue {
  type: 'crash' | 'unresponsive' | 'load_failure' | 'rendering' | 'other';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  detected_at_ms: number; // Relative to test start
}

interface TestMetadata {
  game_title?: string;
  actions_performed: number;
  screens_navigated: number;
  browser_errors: number;
  agent_version: string;
}
```

### LLM Evaluation Schema
```typescript
interface LLMEvaluation {
  successful_load: boolean;
  responsive_controls: boolean;
  stable: boolean;
  playability_score: number; // 0-100
  confidence: number; // 0-100
  issues: string[];
  recommendations: string[];
  reasoning: string; // Chain of thought
}
```

## APIs and Integrations

### External Services

**Browserbase API**
- Purpose: Managed headless browser infrastructure
- Integration: Initialize browser sessions, get browser connection URL
- Fallback: Local Playwright instance if Browserbase unavailable

**Stagehand Library**
- Purpose: AI-powered browser automation
- Integration: `act()` for interactions, `observe()` for state detection
- Fallback: Direct Playwright commands for simple interactions

**LLM APIs (via Vercel AI SDK)**
- Purpose: Image and log analysis for playability assessment
- Providers: OpenAI GPT-4V, Anthropic Claude 3.5 Sonnet, Google Gemini
- Integration: Structured outputs with JSON schema validation

### Internal Interfaces

**CLI Interface**
```bash
qa-agent <game-url> [options]
  --timeout <ms>       Max execution time (default: 300000)
  --screenshots <n>    Number of screenshots (default: 5)
  --output <dir>       Output directory (default: ./test-results)
  --headed            Run browser in headed mode for debugging
```

**Programmatic Interface**
```typescript
import { testGame } from './qa-agent';

const result = await testGame({
  url: 'https://example.com/game',
  timeout: 300000,
  screenshotCount: 5,
  outputDir: './test-results'
});

console.log(result.status); // 'pass' | 'fail' | 'error'
```

## Infrastructure Requirements

### Development Environment
- Node.js 18+ with Bun or npm
- TypeScript 5+
- Browserbase account (free tier: 1 browser-hour)
- LLM API key (OpenAI, Anthropic, or Google)

### Runtime Environment
- Supports AWS Lambda (Node.js 18 runtime)
- Max memory: 2GB (for screenshot storage)
- Max execution time: 15 minutes (Lambda limit)
- No persistent storage required (artifacts saved to /tmp in Lambda)

### Dependencies
```json
{
  "dependencies": {
    "@browserbasehq/stagehand": "^1.0.0",
    "ai": "^3.0.0",  // Vercel AI SDK
    "playwright": "^1.40.0",
    "commander": "^11.0.0"
  }
}
```

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│                 Execution Layer                      │
│  (CLI / Lambda Function / Programmatic API)          │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│              Test Orchestrator                       │
│  - Parse input                                       │
│  - Coordinate modules                                │
│  - Handle errors/timeouts                            │
│  - Generate final report                             │
└──────┬────────────────┬────────────────┬───────────┘
       │                │                │
       ▼                ▼                ▼
┌──────────┐    ┌──────────────┐    ┌─────────────┐
│ Browser  │    │  Evidence    │    │    AI       │
│  Agent   │───▶│  Capture     │───▶│ Evaluator   │
│          │    │              │    │             │
│ - Load   │    │ - Screenshots│    │ - Analyze   │
│ - Click  │    │ - Logs       │    │ - Score     │
│ - Type   │    │ - Manifest   │    │ - Report    │
└──────────┘    └──────────────┘    └─────────────┘
       │                │                │
       └────────────────┴────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  File System    │
              │  ./test-results/│
              └─────────────────┘
```

# Development Roadmap

## MVP: Core QA Pipeline (Scope: 3-5 days)

The MVP delivers a functional, end-to-end automated QA agent that can test any browser game and provide actionable feedback.

### Phase 1: Foundation & Basic Automation
**Goal:** Get a browser loading a game and taking one screenshot.

**Scope:**
- Set up TypeScript project with Bun/npm
- Integrate Browserbase SDK and initialize browser sessions
- Implement basic `testGame()` function that accepts URL
- Load a game URL in headless browser
- Wait for page load (simple timeout)
- Capture one screenshot
- Save screenshot to local file system

**Deliverable:** Script that loads a game and saves a screenshot to `./test-results/`

**Validation:** Run against simple HTML5 game (e.g., tic-tac-toe), verify screenshot is saved.

### Phase 2: Intelligent Interaction
**Goal:** Agent can find and click interactive elements autonomously.

**Scope:**
- Integrate Stagehand library for AI-powered automation
- Detect and click "Play" or "Start" buttons using `act()` function
- Implement basic action sequence: wait → find button → click → wait for result
- Add timeout logic (5-minute max execution time)
- Implement retry logic for failed page loads (3 attempts with exponential backoff)
- Take 2-3 screenshots during interaction (before click, after click, end state)

**Deliverable:** Agent that can autonomously start games and progress through initial screens.

**Validation:** Test against 3 games (puzzle, platformer, idle), verify agent clicks start button and captures gameplay.

### Phase 3: Comprehensive Evidence Collection
**Goal:** Capture all necessary artifacts for evaluation.

**Scope:**
- Implement structured screenshot capture (3-5 images at strategic moments)
- Add browser console log capture (errors, warnings, info)
- Create file organization structure: `./test-results/{game-id}/{timestamp}/`
- Generate manifest.json with metadata about captured evidence
- Implement graceful degradation (continue test if screenshot fails)
- Add error detection (page crashes, blank screens)

**Deliverable:** Complete evidence collection system with organized artifacts.

**Validation:** Verify all artifacts are saved correctly, test with a crashing game to ensure error logs are captured.

### Phase 4: LLM Evaluation Integration
**Goal:** Analyze evidence using AI to generate playability scores.

**Scope:**
- Integrate Vercel AI SDK with LLM provider (OpenAI/Anthropic/Google)
- Design structured evaluation prompt with specific questions:
  - "Does the game load successfully?"
  - "Are controls responsive?"
  - "Did the game remain stable?"
- Implement image + text submission to LLM
- Parse and validate LLM JSON responses
- Calculate playability score (0-100) based on evaluation
- Add confidence scoring
- Implement fallback heuristics (if LLM fails, use console errors + screenshot analysis)

**Deliverable:** AI-powered evaluation system that generates playability assessments.

**Validation:** Test with 5 games, manually verify that LLM assessments align with actual game quality.

### Phase 5: Report Generation & Interface
**Goal:** Package everything into usable output format.

**Scope:**
- Implement JSON report generation conforming to schema
- Create CLI interface: `qa-agent <game-url>`
- Add command-line options (timeout, screenshot count, output directory)
- Implement programmatic API for Lambda invocation
- Add terminal output with progress indicators
- Generate human-readable summary in addition to JSON
- Write comprehensive README documentation

**Deliverable:** Complete, usable QA agent with clean interface.

**Validation:** Run end-to-end tests on 5 diverse games, verify all outputs are correct and readable.

### Phase 6: Testing, Polish & Documentation
**Goal:** Ensure robustness and prepare for delivery.

**Scope:**
- Test against 5 diverse game types (see Test Strategy section)
- Handle edge cases:
  - Games that never load
  - Games with no interactive elements
  - Games that crash immediately
  - Very slow-loading games
- Refine error messages
- Add unit tests for critical functions (optional but recommended)
- Create demo video (2-5 minutes)
- Document known limitations
- Add troubleshooting guide to README

**Deliverable:** Production-ready MVP with comprehensive documentation.

**Validation:** Successfully tests 3+ diverse games with 80%+ accuracy, demo video completed.

---

## Post-MVP: Stretch Features (Optional)

These features extend the MVP but are not required for initial delivery. Implement only if core MVP is complete and time permits.

### Stretch 1: GIF Recording
**Scope:**
- Integrate screen recording library (e.g., Puppeteer recorder)
- Capture 10-30 second gameplay GIF
- Optimize file size for storage
- Include GIF in test artifacts

**Value:** Provides richer visual evidence than static screenshots, easier to spot interaction issues.

### Stretch 2: Batch Testing
**Scope:**
- Accept array of game URLs as input
- Test games sequentially with progress tracking
- Generate individual reports per game
- Create aggregated summary report with comparative statistics

**Value:** Enables bulk testing of game portfolios, useful for regression testing.

### Stretch 3: Advanced Metrics
**Scope:**
- Monitor frames per second (FPS) during gameplay
- Measure initial load time (time to interactive)
- Check basic accessibility compliance (WCAG)
- Add metrics to report output

**Value:** Provides quantitative performance data beyond binary pass/fail.

---

## Future Evolution: v2.0 and Beyond

These features are explicitly out of scope for initial delivery but represent the long-term vision.

### v2.0: Web Dashboard
**Scope:**
- Build simple web UI (React/Next.js)
- Display real-time test progress
- Browse historical test results with filtering
- View screenshots and logs in browser
- Export reports as PDF or HTML
- User authentication for multi-team access

**Value:** Makes QA results accessible to non-technical stakeholders, enables collaborative review.

### v2.5: Game Classification & Adaptive Testing
**Scope:**
- Automatically detect game type (puzzle, platformer, idle, shooter, etc.)
- Tailor interaction strategy based on game type
- Use different action sequences for different genres
- Learn from test results to improve classification accuracy

**Value:** More intelligent testing that adapts to game mechanics, higher success rate.

### v3.0: DreamUp Production Integration
**Scope:**
- Integrate directly with DreamUp game generation pipeline
- Automatic testing of newly generated games
- Feedback loop to game-building agent (send test results back)
- Quality gates (block low-quality games from deployment)
- A/B testing support (compare game variants)

**Value:** Closes the self-improvement loop for game-building agent.

# Logical Dependency Chain

This section defines the order in which features must be built to maximize progress velocity and minimize rework.

## Layer 1: Foundation (Day 1)
**Must be built first—everything depends on this.**

1. **Project Setup**
   - Initialize TypeScript project
   - Configure Browserbase SDK
   - Set up basic file structure

2. **Basic Browser Control**
   - Load URL in headless browser
   - Wait for page load
   - Close browser cleanly

3. **Screenshot Capture**
   - Take single screenshot
   - Save to file system
   - Generate unique filename

**Why this order:** Need working browser automation before any other feature. Screenshot capability is the simplest evidence collection and validates browser integration works.

**Milestone:** Can load a game and save one screenshot.

---

## Layer 2: Interaction Foundation (Day 2)
**Builds on Layer 1—enables autonomous behavior.**

4. **Stagehand Integration**
   - Install and configure Stagehand
   - Implement `act()` for button detection and clicking

5. **Action Sequencing**
   - Define action sequence: observe → act → wait → observe
   - Execute 2-3 actions per test
   - Basic game state detection

6. **Error Handling**
   - Implement timeout (5-minute max)
   - Add retry logic for page loads (3 attempts)
   - Detect and handle page crashes

**Why this order:** Must have Stagehand working before building action sequences. Error handling prevents infinite loops and makes development safer.

**Milestone:** Agent can find and click start button, progress through 1-2 screens.

---

## Layer 3: Complete Evidence Collection (Day 3)
**Builds on Layer 2—enables evaluation.**

7. **Multi-Screenshot System**
   - Capture 3-5 screenshots at key moments
   - Strategic timing: baseline, during interaction, end state

8. **Console Log Capture**
   - Hook into browser console events
   - Capture errors, warnings, info messages
   - Save logs to file

9. **Structured File Organization**
   - Create directory structure: `test-results/{game-id}/{timestamp}/`
   - Generate manifest.json
   - Link screenshots to timeline

**Why this order:** Need action sequences working before knowing where to take screenshots. Console logs can be added in parallel to screenshots.

**Milestone:** All test artifacts are captured and organized for analysis.

---

## Layer 4: AI Evaluation (Day 4)
**Builds on Layer 3—transforms evidence into insights.**

10. **LLM Integration**
    - Set up Vercel AI SDK
    - Connect to LLM provider (OpenAI/Anthropic)

11. **Structured Prompting**
    - Design evaluation prompt with specific questions
    - Implement JSON schema for responses
    - Handle image + text submissions

12. **Response Processing**
    - Parse and validate LLM outputs
    - Calculate playability score
    - Generate issue descriptions
    - Implement fallback heuristics

**Why this order:** Must have complete evidence before designing prompts. Prompting is iterative and needs real test data to refine.

**Milestone:** LLM analyzes screenshots and logs, returns structured playability assessment.

---

## Layer 5: Interface & Output (Day 4-5)
**Builds on Layer 4—makes system usable.**

13. **Report Generation**
    - Format evaluation results as JSON
    - Conform to output schema
    - Include all artifact paths

14. **CLI Interface**
    - Parse command-line arguments
    - Add options (timeout, screenshots, output dir)
    - Display progress in terminal

15. **Programmatic API**
    - Export `testGame()` function
    - Make Lambda-compatible
    - Return Promise with results

**Why this order:** Need complete pipeline before building interface. CLI and API can be built in parallel.

**Milestone:** Can run `qa-agent <url>` and get JSON report with screenshots.

---

## Layer 6: Polish & Validation (Day 5)
**Builds on Layer 5—ensures quality.**

16. **Edge Case Handling**
    - Test with broken games
    - Test with non-games (regular websites)
    - Test with extremely slow-loading games

17. **Error Message Refinement**
    - Improve error clarity
    - Add troubleshooting hints
    - Handle unexpected failures gracefully

18. **Documentation**
    - Write comprehensive README
    - Add inline code comments
    - Create demo video
    - Document known limitations

**Why this order:** Must have working system before testing edge cases. Documentation should reflect actual implementation, not planned features.

**Milestone:** System handles 80%+ of games correctly, documentation is complete.

---

## Iteration Strategy

### Horizontal vs. Vertical Slicing
**Use vertical slices:** Build complete, working flows for simple cases before adding complexity.

**Example vertical slice:**
- Day 1: Load game → take screenshot → save file
- Day 2: Load game → click start button → take 2 screenshots → save files
- Day 3: Load game → click start → capture logs → save artifacts
- Day 4: Load game → click start → capture evidence → LLM evaluation → JSON report

**Avoid horizontal slices:** Don't build all of Layer 1, then all of Layer 2, etc. Instead, build thin vertical slices that work end-to-end, then add depth.

### Getting to Visible Frontend Quickly
**Target: End of Day 2**

By Day 2 afternoon, you should be able to:
1. Run `bun run qa.ts https://html5games.com/simple-game`
2. See terminal output: "Loading game... Clicking start button... Capturing screenshots... Done!"
3. Open `test-results/` folder and see 2-3 screenshots showing game progression

**This provides:**
- Immediate visual feedback that system works
- Debugging capability (can see what agent sees)
- Motivation and momentum
- Early validation of approach

### Atomic Feature Scoping

Each feature should be:
- **Independently testable:** Can verify it works in isolation
- **Deliverable in 2-4 hours:** Small enough to complete in one session
- **Builds on previous work:** Reuses existing components
- **Improves on next iteration:** Provides foundation for next feature

**Example: Screenshot feature progression**
- Iteration 1: Take one screenshot and save it (2 hours)
- Iteration 2: Take 3 screenshots at fixed intervals (1 hour)
- Iteration 3: Take screenshots at strategic moments based on agent actions (2 hours)
- Iteration 4: Add error handling if screenshot fails (1 hour)

Each iteration delivers a working system that's slightly better than before.

# Risks and Mitigations

## Technical Challenges

### Risk: Agent loops infinitely or gets stuck
**Impact:** High—test never completes, wastes resources.

**Indicators:**
- Agent clicks the same element repeatedly
- Test runs beyond 5-minute timeout
- Action count exceeds expected range (>50 actions)

**Mitigation:**
- Implement strict timeout (5 minutes maximum)
- Add max action count limit (50 actions)
- Track page state to detect loops (if last 3 screenshots are identical, stop)
- Force termination if timeout reached, return partial results

### Risk: LLM evaluation gives inconsistent results
**Impact:** Medium—reduces assessment accuracy, makes system unreliable.

**Indicators:**
- Same game gets different scores on repeat tests
- Confidence scores are consistently low (<50%)
- LLM identifies issues that don't exist

**Mitigation:**
- Use structured prompts with explicit evaluation criteria
- Implement confidence threshold (flag results below 60% for review)
- Add fallback heuristics (if console has errors → score = fail)
- Test multiple LLM providers and compare results
- Cache and compare results across runs for same game

### Risk: Games don't load properly in headless browser
**Impact:** High—core functionality fails, can't test many games.

**Indicators:**
- Screenshots are blank or black
- Console shows WebGL or canvas errors
- Games work in regular browser but not headless

**Mitigation:**
- Test with headed mode first to validate games work
- Use Browserbase (cloud browser with GPU support) instead of local headless
- Implement screenshot comparison (if screenshot is all black, flag error)
- Add user agent spoofing for games that detect automation
- Provide fallback to local Playwright if Browserbase fails

### Risk: Browserbase free tier is insufficient
**Impact:** Low—may need to upgrade or switch providers.

**Indicators:**
- Run out of browser-hours during development
- API rate limits hit
- Concurrent session limits reached

**Mitigation:**
- Monitor usage carefully (free tier = 1 browser-hour)
- Implement local Playwright fallback for development
- Use mocked tests during iteration (don't hit Browserbase for every code change)
- Budget for paid tier if needed (~$100-200 for project duration)

### Risk: Lambda execution timeout (15-minute max)
**Impact:** Medium—limits batch testing and complex games.

**Indicators:**
- Tests consistently take >10 minutes
- Lambda timeout errors in logs
- Slow-loading games fail

**Mitigation:**
- Optimize execution time (target <5 minutes per game)
- Implement early termination for slow games (stop after 5 minutes, return partial results)
- For batch testing, use Step Functions instead of single Lambda
- Set realistic expectations (some games may be too complex for Lambda)

## Figuring Out the MVP

### Risk: Scope creep—trying to build too much
**Impact:** High—fail to deliver working MVP in 3-5 days.

**Indicators:**
- Adding "just one more feature" repeatedly
- Core features still incomplete on Day 4
- Focusing on polish before foundation works

**Mitigation:**
- **Strict prioritization:** Core features only (FR-1 through FR-4), no stretch goals until MVP complete
- **Time-boxing:** If a feature takes >4 hours, simplify or defer
- **Daily milestones:** Must hit Day 1-5 targets in roadmap
- **"Ship it" mentality:** Working system that tests 3 games > polished system that tests 0 games

### Risk: Under-scoping—building something too simple
**Impact:** Medium—deliver prototype that doesn't meet success criteria.

**Indicators:**
- System only works for one game type
- Hardcoded interactions instead of AI-powered detection
- No error handling or edge cases
- Manual intervention required

**Mitigation:**
- Test with 5 diverse games throughout development (not just at the end)
- Validate success criteria daily: "Does this work for puzzle, platformer, AND idle games?"
- Get feedback early (show progress on Day 2-3)
- Compare implementation against original requirements (use PRD as checklist)

### Risk: Building the wrong thing
**Impact:** High—deliver system that doesn't solve the actual problem.

**Indicators:**
- Focus on features not mentioned in requirements
- Building UI before core agent works
- Optimizing for edge cases instead of common cases

**Mitigation:**
- Re-read "Success Criteria" section before starting each day
- Ask: "Does this directly contribute to testing games and generating playability reports?"
- Validate with real use case: "Would the game-building agent find this useful?"
- Stick to vertical slices (complete flows) over horizontal slices (all of one layer)

## Resource Constraints

### Risk: API costs exceed budget
**Impact:** Low—unexpected expenses during development.

**Indicators:**
- Making hundreds of LLM calls during testing
- Using expensive models (GPT-4V) for every iteration
- Not caching responses

**Mitigation:**
- Use cheaper models during development (GPT-3.5, Claude Haiku)
- Implement response caching (don't re-evaluate same screenshots)
- Mock LLM responses during unit testing
- Estimate costs upfront: ~$0.01-0.05 per game test × 100 tests = $1-5 total

### Risk: Development time exceeds 5 days
**Impact:** Medium—miss delivery deadline, incomplete prototype.

**Indicators:**
- Falling behind daily milestones
- Spending >4 hours on single feature
- Blocked on external dependencies

**Mitigation:**
- Aggressive time-boxing (4 hours max per feature)
- Cut scope if behind schedule (defer stretch goals, simplify features)
- Parallelize where possible (CLI and API in parallel)
- Ask for help early if blocked (use #dreamup-projects Slack channel)

### Risk: Lack of test games for validation
**Impact:** Low—difficulty validating system works across game types.

**Indicators:**
- Can't find diverse games to test
- Games are behind logins or paywalls
- Games require plugins or special browsers

**Mitigation:**
- Use suggested sources: itch.io, kongregate.com, html5games.com
- Create simple test games if needed (basic HTML5 canvas games)
- Focus on free, publicly accessible games
- Document which games were tested for reproducibility

## Technical Unknowns

### Risk: Stagehand doesn't work as expected
**Impact:** High—core interaction feature fails.

**Mitigation:**
- Read Stagehand documentation thoroughly before starting
- Test Stagehand in isolation (separate script) before integrating
- Have Playwright as backup plan (more manual but reliable)
- Join Stagehand Discord/community for support

### Risk: LLM can't accurately assess games from screenshots
**Impact:** High—evaluation feature fails, system delivers inaccurate results.

**Mitigation:**
- Test LLM evaluation early (Day 4) to validate approach
- Compare LLM assessments to manual assessments
- Use multiple screenshots (5) instead of just 1-2
- Include console logs to provide additional context
- Try multiple LLM providers (GPT-4V, Claude 3.5 Sonnet, Gemini)
- Have confidence scoring to flag uncertain results

# Appendix

## Research Findings

### Browser Automation Options Evaluated

**Browserbase + Stagehand (Recommended)**
- Pros: AI-powered element detection, managed infrastructure, GPU support
- Cons: Requires API key, limited free tier
- Use case: Production-ready solution with minimal setup

**Playwright (Backup)**
- Pros: Free, full control, extensive documentation
- Cons: Manual element detection, no AI assistance, local setup required
- Use case: Development fallback if Browserbase issues

**Puppeteer**
- Pros: Lightweight, Node-native
- Cons: Chromium-only, less maintained than Playwright
- Use case: Not recommended for this project

### LLM Provider Comparison

| Provider | Model | Vision Support | Cost per Test | Latency |
|----------|-------|----------------|---------------|---------|
| OpenAI | GPT-4V | ✅ | $0.03-0.05 | 3-5s |
| Anthropic | Claude 3.5 Sonnet | ✅ | $0.02-0.04 | 2-4s |
| Google | Gemini 1.5 Pro | ✅ | $0.01-0.03 | 2-3s |

**Recommendation:** Start with Claude 3.5 Sonnet (best balance of cost, speed, accuracy). Gemini is cheaper but newer. GPT-4V is most expensive but well-documented.

### Game Test Sources

**itch.io/games/html5**
- Pros: Huge variety, free games, direct browser play
- Cons: Quality varies, some NSFW content, ads

**kongregate.com**
- Pros: Curated selection, ratings/reviews, stable hosting
- Cons: Some require accounts, Flash games mixed with HTML5

**html5games.com**
- Pros: Clean, ad-free, modern games
- Cons: Smaller selection

## Technical Specifications

### Minimum Requirements
- Node.js 18+
- 2GB RAM (for browser + screenshots)
- 1GB disk space (for artifacts)
- Internet connection (for Browserbase and LLM APIs)

### Recommended Development Setup
- TypeScript 5.0+
- Bun (faster than npm) or Node.js with npm
- VS Code with TypeScript extensions
- Git for version control

### Environment Variables
```bash
# Required
BROWSERBASE_API_KEY=your_api_key_here
BROWSERBASE_PROJECT_ID=your_project_id_here

# LLM Provider (choose one)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key

# Optional
TEST_TIMEOUT_MS=300000  # 5 minutes
SCREENSHOT_COUNT=5
OUTPUT_DIR=./test-results
```

### File Structure
```
dreamup-qa/
├── src/
│   ├── index.ts              # Main entry point
│   ├── orchestrator.ts       # Test coordinator
│   ├── browser-agent.ts      # Browser automation
│   ├── evidence-capture.ts   # Screenshot + log capture
│   ├── ai-evaluator.ts       # LLM integration
│   ├── report-generator.ts   # JSON output
│   └── types.ts              # TypeScript interfaces
├── test/
│   ├── browser-agent.test.ts
│   └── ai-evaluator.test.ts
├── test-results/             # Output directory (gitignored)
├── examples/
│   └── simple-test.ts        # Usage example
├── package.json
├── tsconfig.json
├── README.md
└── .env
```

### JSON Output Schema (Full)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["status", "playability_score", "timestamp"],
  "properties": {
    "status": {
      "type": "string",
      "enum": ["pass", "fail", "error"]
    },
    "playability_score": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "game_url": {
      "type": "string",
      "format": "uri"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "execution_time_ms": {
      "type": "number",
      "minimum": 0
    },
    "issues": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "severity", "description"],
        "properties": {
          "type": {
            "type": "string",
            "enum": ["crash", "unresponsive", "load_failure", "rendering", "other"]
          },
          "severity": {
            "type": "string",
            "enum": ["critical", "major", "minor"]
          },
          "description": {
            "type": "string"
          },
          "detected_at_ms": {
            "type": "number"
          }
        }
      }
    },
    "screenshots": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "console_logs": {
      "type": "string"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "game_title": {
          "type": "string"
        },
        "actions_performed": {
          "type": "number"
        },
        "screens_navigated": {
          "type": "number"
        },
        "browser_errors": {
          "type": "number"
        },
        "agent_version": {
          "type": "string"
        }
      }
    }
  }
}
```

### LLM Evaluation Prompt (Complete)
```
You are an expert game QA analyst. Your task is to evaluate whether a browser-based game is playable based on visual and diagnostic evidence.

You will be provided with:
1. Multiple screenshots showing the game at different stages
2. Browser console logs (errors, warnings, info)
3. Metadata about the test execution

Analyze the evidence and answer these specific questions:

## Evaluation Criteria

### 1. Successful Load
- Is the game visible and rendered correctly?
- Are game assets (sprites, backgrounds, UI) displaying?
- Is the game canvas present and not blank?

### 2. Responsive Controls
- Do user inputs (clicks, key presses) produce expected changes?
- Does the game state progress when actions are taken?
- Are UI elements interactive (buttons respond to clicks)?

### 3. Stability
- Did the game run without crashes or freezes?
- Are there critical errors in the console logs?
- Does the page remain responsive throughout?

## Evidence Provided

Screenshots (in chronological order):
{{SCREENSHOTS}}

Console Logs:
{{CONSOLE_LOGS}}

Metadata:
- Actions performed: {{ACTIONS_COUNT}}
- Execution time: {{EXECUTION_TIME_MS}}ms
- Browser errors: {{ERROR_COUNT}}

## Required Output

Respond with a JSON object following this exact schema:

{
  "successful_load": boolean,
  "responsive_controls": boolean,
  "stable": boolean,
  "playability_score": number (0-100),
  "confidence": number (0-100),
  "issues": string[],
  "recommendations": string[],
  "reasoning": string
}

### Scoring Guidelines:
- 80-100: Fully playable, no significant issues
- 60-79: Playable with minor issues
- 40-59: Partially playable, major issues present
- 20-39: Barely playable, critical issues
- 0-19: Not playable, fails to load or crashes immediately

### Confidence Guidelines:
- 90-100: Evidence is clear and unambiguous
- 70-89: Evidence is mostly clear, minor uncertainties
- 50-69: Evidence is ambiguous, multiple interpretations possible
- <50: Insufficient evidence or contradictory signals

Be specific in your issue descriptions and recommendations. Focus on actionable feedback that would help a developer fix the problems.
```

### Test Game URLs (For Validation)
```
# Simple Puzzle (Tic-Tac-Toe)
https://codepen.io/coding_dev/full/xxVWKqj

# Platformer (Basic)
https://www.html5gamedevs.com/topic/1388-open-source-games/

# Idle Clicker
https://orteil.dashnet.org/cookieclicker/

# Broken Game (for testing error detection)
[Create intentionally broken HTML5 game for testing]

# Complex Multi-Screen
https://www.html5gamedevs.com/topic/1388-open-source-games/
```

---

**Contact & Support**

**Project Owner:** Matt Smith  
**Email:** matt.smith@superbuilders.school  
**Slack:** #dreamup-projects channel (Gauntlet workspace)

For questions, issues, or clarifications, reach out via Slack or email.

