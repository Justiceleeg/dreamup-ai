---
description: DreamUp QA Pipeline - Use Node.js for this project (browser automation requirement)
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: true
---

## DreamUp QA Pipeline - Runtime Requirements

**⚠️ This project requires Node.js 18+ (not Bun)**

### Why Node.js Instead of Bun?

The DreamUp QA Pipeline uses **Stagehand** for AI-powered browser automation.
Stagehand depends on **Playwright**, which currently only supports Node.js runtime.

**Reference:** https://github.com/microsoft/playwright/issues/27139

### How to Run This Project

```bash
# Install dependencies (pnpm recommended, npm also works)
pnpm install
# or
npm install

# Run the QA pipeline
pnpm dlx tsx ./src/index.ts <game-url>
# or with npm
npx tsx ./src/index.ts <game-url>

# Alternative with Node.js directly
node --loader tsx ./src/index.ts <game-url>

# Run tests
pnpm dlx tsx test-layer1.ts
# or
npx tsx test-layer1.ts
```

### Development Notes

- Write all code in **TypeScript** (strict mode enabled)
- Code is type-safe and follows best practices
- Environment variables loaded from `.env` automatically
- Use Node.js tooling (npm, npx, tsx)
- All source files use `.ts` extension

### Project Structure

```
src/
├── index.ts              # Main entry point
├── types.ts              # TypeScript types
├── browser-agent.ts      # Browser automation
└── evidence-capture.ts   # Screenshot management
```

### Key Technologies

- **Stagehand** - AI-powered browser automation
- **Browserbase** - Managed browser infrastructure
- **Playwright** - Browser control (via Stagehand)
- **TypeScript** - Type-safe development
- **Commander** - CLI framework
