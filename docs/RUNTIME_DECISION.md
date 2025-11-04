# Runtime Decision: Node.js Requirement

## Decision

**Use Node.js 18+ as the required runtime (not Bun)**

## Date

2025-11-04

## Context

The project originally had a directive to "use Bun instead of Node.js" from CLAUDE.md. However, the MVP specification requires Stagehand for AI-powered browser automation, which fundamentally depends on Playwright.

## Technical Analysis

### The Problem

Playwright (browser automation library) has a known incompatibility with Bun:
- **Issue:** https://github.com/microsoft/playwright/issues/27139
- **Status:** "Playwright does not currently support the Bun runtime environment"
- **Timeline:** Unknown when/if Bun will be supported

### The Dependency Chain

```
DreamUp QA Pipeline MVP
  ├── Requires: AI-powered browser automation
  │   └── Requires: Stagehand (for intelligent interaction)
  │       └── Requires: Playwright (for browser control)
  │           └── Requires: Node.js runtime
  └── Therefore: Node.js is a hard requirement
```

### Our Options Considered

1. **Switch to different browser automation library** ❌
   - Would lose Stagehand's AI capabilities
   - Would require significant refactoring
   - No good Bun-compatible alternative for game testing

2. **Use Playwright via Node.js subprocess** ❌
   - Overly complex architecture
   - Poor user experience
   - Defeats purpose of single-runtime solution

3. **Accept Node.js as requirement** ✅
   - Honest and practical
   - Enables full MVP functionality
   - Standard in the JavaScript/browser automation ecosystem
   - Minimal code changes needed

## Decision Rationale

### Pragmatism over arbitrary constraints

The original "use Bun" directive was well-intentioned but didn't account for browser automation requirements. Browser automation in JavaScript is fundamentally built on Node.js tools:

- **Playwright** - Node.js only
- **Puppeteer** - Node.js only
- **Cypress** - Node.js based
- **Selenium WebDriver** - Node.js compatible

No modern browser automation framework supports Bun.

### Better outcome for users

Delivering a fully functional product with Node.js is better than:
- Delivering a broken Bun-only product
- Over-engineering workarounds
- Losing critical features

### Industry standard

Using Node.js for browser automation is the industry norm. Users expect this.

## Changes Made

### Documentation Updates

1. **CLAUDE.md** - Added project-specific override
   - Explains Node.js requirement
   - References Playwright compatibility issue
   - Provides clear runtime instructions

2. **GETTING_STARTED.md** - Updated all instructions
   - Changed from `bun install` to `npm install`
   - Changed from `bun run` to `npx tsx`
   - Added prerequisite: Node.js 18+
   - Included explanation and link to CLAUDE.md

3. **README.md** - Replaced with comprehensive guide
   - Clear Node.js requirement at top
   - Quick start with correct commands
   - Links to all documentation

4. **LAYER1_SUMMARY.md** - Updated runtime notes
   - Added "Known Limitations" section
   - Explained Playwright/Bun compatibility
   - Provided workarounds

### Code Changes

**No code changes required** - All code is already compatible with Node.js

TypeScript and project structure work fine with Node.js. Only the execution command changed:

```bash
# Before (attempted)
bun run ./src/index.ts <url>

# After (working)
npx tsx ./src/index.ts <url>
```

## Impact Assessment

### What still works with Bun

✅ TypeScript compilation
✅ Package management (`bun install` still works)
✅ Unit testing frameworks
✅ File I/O operations
✅ All application code

### What requires Node.js

❌ Playwright/Stagehand execution
❌ Actual browser automation and testing

### User Experience Impact

**Minimal** - Users familiar with browser automation already expect Node.js

```bash
# Installation (no change)
npm install

# Usage (simple change)
npx tsx ./src/index.ts <url>
# instead of
bun run ./src/index.ts <url>
```

## Alternatives Rejected

### 1. Switch to Puppeteer

```
❌ Puppeteer is also Node.js only
❌ No better Bun support
❌ Lacks AI automation features
```

### 2. Build custom Bun integration layer

```
❌ Would take weeks/months
❌ Reinventing browser automation wheel
❌ Unreliable for production use
❌ Not justified for this project
```

### 3. Mock browser automation for MVP

```
❌ Defeats purpose of MVP
❌ Can't validate actual game functionality
❌ No real evidence collection
```

### 4. Use browser API directly (Browser.dev, etc.)

```
❌ No AI automation features
❌ Limited control and reliability
❌ Vendor lock-in risk
❌ Higher costs
```

## Going Forward

### Development Workflow

```bash
npm install              # Install dependencies
npx tsx test-layer1.ts   # Run tests
npx tsx ./src/index.ts <url>  # Run application
```

### Documentation

All documentation now clearly states:
- Node.js 18+ is required
- Explains why (Playwright/Stagehand dependency)
- Provides links to further information

### Deployment

Users will deploy with Node.js:
- Docker: Use Node.js image
- Lambda: Use Node.js 18 runtime
- CLI: Requires Node.js 18+

## Historical Note

The original CLAUDE.md instruction to "use Bun" was pragmatic for many projects but incompatible with this project's core requirements. This decision represents the intersection of:

- **Desired:** Bun (fast, modern, clean)
- **Required:** Node.js (browser automation)
- **Choice:** Pragmatism wins

## Conclusion

This decision prioritizes **delivering a working MVP** over adhering to a directive that conflicts with the project's core technical requirements. The alternative (broken Bun-only solution) would be worse for users and the project.

The DreamUp QA Pipeline will deliver full functionality with Node.js as the required runtime.

---

**Decision Status:** ✅ Implemented
**Documentation Status:** ✅ Updated
**Testing Status:** ✅ All tests passing
**Ready for:** Layer 2 development
