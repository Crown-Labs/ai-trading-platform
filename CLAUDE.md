# AI Trading Platform - Team Collaboration Rules

This document provides guidelines for AI assistants (like Claude, Openclaw, etc.) working on this project.

## Project Overview

**Type:** Monorepo (Yarn Workspaces)
**Purpose:** AI-powered trading platform with web frontend and API backend

### Architecture

```
ai-trading-platform/
├── packages/
│   ├── web/          # React + TypeScript + Vite frontend
│   ├── backend/      # NestJS + TypeScript API
│   └── shared/       # Shared TypeScript utilities & types
├── openclaw/         # OpenClaw AI gateway config (SOUL.md, openclaw.json)
├── .github/workflows/  # CI/CD (test.yml, deploy.yml)
├── docker-compose*.yml # Multiple compose files (dev, prod, build)
├── package.json      # Root workspace configuration
└── CLAUDE.md        # This file
```

### Tech Stack

**Frontend (Web)**
- React 19 with TypeScript
- Vite 8 for build tooling
- Tailwind CSS v3 for styling
- React Query (@tanstack/react-query) for data fetching
- Lightweight Charts + Recharts for charting
- React Markdown for AI chat rendering
- Custom dark theme design

**Backend (API)**
- NestJS 11 with TypeScript
- Express as HTTP server
- Swagger/OpenAPI documentation
- Port 4000 with `/api` prefix
- OpenClaw AI gateway integration for strategy generation
- jsep expression parser for backtest conditions
- @ixjb94/indicators-js for technical indicators

**Shared**
- TypeScript utilities and types (StrategyDSL, BacktestResult, Trade, etc.)
- Shared between web and backend
- CommonJS module format

## Development Commands

```bash
# Install dependencies
yarn install

# Run both web and backend concurrently
yarn dev

# Run individually
yarn web dev      # http://localhost:3000
yarn backend dev  # http://localhost:4000/api

# Build
yarn web build
yarn backend build

# Test
yarn backend test
yarn web test
yarn shared test
```

## Core Principles

### 1. Monorepo Structure
- All packages must remain in `packages/` directory
- Use workspace dependencies: `@ai-trading/web`, `@ai-trading/backend`, `@ai-trading/shared`
- Never modify root `package.json` workspaces configuration without explicit approval

### 2. Shared Package Usage
- Put reusable utilities and types in `packages/shared/src/`
- Both web and backend can import from `@ai-trading/shared`
- Export everything through `packages/shared/src/index.ts`

### 3. TypeScript First
- All new code must be TypeScript
- Use proper types, avoid `any` when possible
- Shared types should live in `@ai-trading/shared`

## Code Standards

### Backend (NestJS)

**File Structure:**
```
packages/backend/src/
├── main.ts                 # Application entry, Swagger setup
├── app.module.ts           # Root module (imports all feature modules)
├── app.controller.ts       # Root controller (health, info)
├── app.service.ts          # Root service
├── dto/                    # Shared Data Transfer Objects
│   ├── *.dto.ts            # DTOs with @ApiProperty decorators
│   └── index.ts            # Barrel exports
├── ai/                     # AI chat module (OpenClaw integration)
│   ├── ai.module.ts
│   ├── ai.controller.ts
│   └── ai.service.ts
├── backtest/               # Backtesting module
│   ├── backtest.module.ts
│   ├── backtest.controller.ts
│   ├── backtest.service.ts
│   └── engines/            # Backtest engine components
│       ├── indicator.engine.ts
│       ├── indicator-registry.ts
│       ├── signal.engine.ts
│       ├── condition.engine.ts  # jsep-based expression evaluator
│       ├── risk.engine.ts
│       ├── execution.engine.ts
│       └── metrics.engine.ts
├── market-data/            # Market data module (Binance candles)
│   ├── market-data.module.ts
│   ├── market-data.controller.ts
│   └── market-data.service.ts
└── indicators/             # Technical indicators module
    ├── indicators.module.ts
    └── indicators.service.ts
```

**Creating New Feature Modules:**
The backend uses NestJS feature modules. Each domain area has its own module:
1. Create a new directory under `src/` (e.g., `src/my-feature/`)
2. Create `my-feature.module.ts`, `my-feature.controller.ts`, `my-feature.service.ts`
3. Create DTOs in `src/dto/` with Swagger decorators
4. Import the module in `app.module.ts`
5. Add Swagger decorators to controller methods:
   - `@ApiOperation()` for description
   - `@ApiResponse()` for response schema
   - `@ApiTags()` for grouping

**Example:**
```typescript
// dto/example.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ExampleDto {
  @ApiProperty({ example: 'value' })
  field: string;
}

// app.controller.ts
@Get('example')
@ApiOperation({ summary: 'Example endpoint' })
@ApiResponse({ status: 200, type: ExampleDto })
getExample(): ExampleDto {
  return this.appService.getExample();
}
```

**API Rules:**
- All endpoints prefixed with `/api`
- Always document with Swagger decorators
- Use DTOs for type safety
- CORS configured via `CORS_ORIGIN` env var (defaults to `http://localhost:3000`)

### Frontend (React + Vite)

**File Structure:**
```
packages/web/src/
├── main.tsx              # React entry point
├── App.tsx               # Main app component
├── index.css             # Tailwind directives & global styles
├── components/           # Reusable components
│   ├── Header.tsx
│   ├── StatCard.tsx
│   ├── MarketCard.tsx
│   ├── ChatPanel.tsx           # AI chat interface
│   ├── ChatSidebar.tsx         # Chat session sidebar
│   ├── BacktestChart.tsx       # TradingView-style chart
│   ├── BacktestHeatmap.tsx     # Backtest parameter heatmap
│   ├── BacktestStats.tsx       # Backtest metrics display
│   ├── BacktestVersionNav.tsx  # Strategy version navigation
│   ├── TradeTable.tsx          # Trade history table
│   ├── ConfirmDialog.tsx       # Confirmation modal
│   ├── StrategyDSLViewer.tsx   # Strategy DSL display
│   └── SuggestedStrategyBanner.tsx
├── hooks/                # Custom React hooks
│   ├── useChatSessions.ts      # Chat session state management
│   └── useTradeData.ts         # Trade data fetching
├── lib/                  # Utilities & clients
│   ├── api.ts                  # API client
│   └── trade-store.ts          # IndexedDB state management
├── types/                # TypeScript types
│   └── chat.ts
└── utils/                # Helper utilities
    └── pine-script-generator.ts
```

**Creating New Components:**
1. Create in `components/` folder
2. Use TypeScript with proper prop types
3. Use Tailwind CSS classes (no inline styles)
4. Export as default
5. Use React Query for data fetching (see `lib/api.ts` for the API client)

**Styling Rules:**
- Use Tailwind CSS utility classes only
- Custom classes defined in `index.css` with `@layer components`
- Dark theme colors: `dark-*` (custom palette in tailwind.config.js)
- Primary colors: `primary-*` (custom palette)
- Never use inline styles or CSS modules

**Common Tailwind Patterns:**
```tsx
// Card
<div className="card">...</div>

// Buttons
<button className="btn-primary">Primary</button>
<button className="btn-secondary">Secondary</button>

// Dark theme
<div className="bg-dark-900 text-gray-100">
```

**API Integration:**
- Backend API: `http://localhost:4000/api`
- Use the API client in `lib/api.ts` with React Query
- Handle loading and error states
- Type responses with types from `@ai-trading/shared`

## Common Tasks

### Adding a New API Endpoint

1. Create DTO in `packages/backend/src/dto/my-feature.dto.ts`
2. Add service method in the appropriate feature service (e.g., `backtest.service.ts`)
3. Add controller method in the feature controller with Swagger decorators
4. Export DTO from `dto/index.ts`
5. If adding a new domain, create a new NestJS module and import it in `app.module.ts`
6. Optionally add shared types to `@ai-trading/shared`

### Adding a New React Component

1. Create file in `packages/web/src/components/MyComponent.tsx`
2. Use TypeScript with interface for props
3. Style with Tailwind classes
4. Import and use in `App.tsx` or other components

### Sharing Code Between Web and Backend

1. Add to `packages/shared/src/`
2. Export from `packages/shared/src/index.ts`
3. Import in web or backend: `import { thing } from '@ai-trading/shared'`

## What NOT to Do

### ❌ Never Do These:

1. **Don't modify Tailwind version**
   - Project uses Tailwind v3 specifically
   - Don't upgrade to v4 (incompatible configuration)

2. **Don't change package manager**
   - Always use `yarn`, never npm or pnpm
   - Maintain yarn workspaces structure

3. **Don't bypass Swagger documentation**
   - All API endpoints must have Swagger decorators
   - Always create DTOs for responses

4. **Don't use different styling approaches**
   - No CSS Modules
   - No styled-components
   - No inline styles
   - Only Tailwind CSS

5. **Don't modify root workspace config without approval**
   - Changes to root `package.json` workspaces
   - Changes to monorepo structure

6. **Don't commit without testing**
   - Run `yarn dev` to verify both web and backend work
   - Check console for errors

## Design System

### Colors

**Dark Theme (Primary):**
- `dark-900`: Main background (#0f172a)
- `dark-800`: Card background (#1e293b)
- `dark-700`: Borders (#334155)
- `dark-600`: Hover states (#475569)

**Primary Accent:**
- `primary-500`: Main accent (#0ea5e9)
- `primary-600`: Buttons (#0284c7)
- `primary-700`: Button hover (#0369a1)

**Status Colors:**
- Success: `green-500`
- Error: `red-500`
- Warning: `yellow-500`
- Info: `blue-500`

### Typography

- Headings: `font-bold text-white`
- Body text: `text-gray-300` or `text-gray-400`
- Small text: `text-sm text-gray-400`

### Spacing

- Container: `container mx-auto px-6`
- Sections: `py-16` or `py-20`
- Cards: `p-6`
- Gaps: `gap-6` for grids

## Environment Variables

```bash
# Backend
PORT=4000                          # Backend server port
CORS_ORIGIN=http://localhost:3000  # Allowed CORS origins

# OpenClaw AI Gateway
OPENCLAW_GATEWAY_URL=http://localhost:18789  # OpenClaw API URL
OPENCLAW_GATEWAY_TOKEN=<token>              # Auth token
OPENCLAW_AGENT_ID=strategy-advisor          # Agent name
ANTHROPIC_API_KEY=<key>                     # For OpenClaw AI

# Frontend (baked at build time)
VITE_API_URL=                      # API URL (empty = relative, proxied by nginx)
```

## Docker & Deployment

```bash
# Development (OpenClaw in Docker, app runs locally)
docker compose -f docker-compose.dev.yml up -d
yarn dev

# Full stack (all services in Docker)
docker compose up -d

# Production (pre-built images from Docker Hub)
docker compose -f docker-compose.prod.yml up -d

# Build & push images
docker compose -f docker-compose.build.yml build
docker compose -f docker-compose.build.yml push
```

**Docker Hub images:** `0xthoth/ai-trading-backend`, `0xthoth/ai-trading-web`

## Testing

### Running Tests

```bash
yarn backend test    # Backend unit tests (Jest, node env)
yarn web test        # Frontend unit tests (Jest, jsdom env)
yarn shared test     # Shared package tests
```

### Before Committing

1. Run tests: `yarn backend test && yarn web test`
2. Run `yarn dev` and verify:
   - Web loads at http://localhost:3000
   - Backend runs at http://localhost:4000/api
   - Swagger docs at http://localhost:4000/api/docs
   - No console errors

3. Check API integration:
   - Web can fetch from backend
   - CORS is working
   - Data displays correctly

4. Verify responsive design:
   - Test mobile, tablet, desktop
   - Check navigation menu on mobile

## Git Workflow

### Commit Messages

Follow conventional commits:
```
feat: add new trading endpoint
fix: resolve CORS issue
docs: update API documentation
style: improve card component styling
refactor: simplify state management
```

### When to Ask for Approval

- Changing architecture or tech stack
- Adding new dependencies
- Modifying workspace configuration
- Changing build or deployment processes
- Major refactoring across packages

## Swagger Documentation

All backend endpoints must include:

```typescript
@ApiTags('category')
@ApiOperation({ summary: 'Clear description of what this does' })
@ApiResponse({
  status: 200,
  description: 'Success response description',
  type: ResponseDto,
})
```

Access documentation at: http://localhost:4000/api/docs

## Troubleshooting

### Common Issues

**Tailwind not working:**
- Ensure using v3, not v4
- Check `postcss.config.js` has `tailwindcss: {}`
- Verify `tailwind.config.js` has correct content paths

**Backend not starting:**
- Check port 4000 is available
- Verify all dependencies installed
- Check for TypeScript errors

**Web can't connect to API:**
- Ensure backend is running on port 4000
- Check CORS configuration in `main.ts`
- Verify API URL is `http://localhost:4000/api`

**Shared package not found:**
- Run `yarn install` at root
- Check workspace is properly linked
- Verify import path: `@ai-trading/shared`

## Additional Resources

- **Swagger UI:** http://localhost:4000/api/docs
- **NestJS Docs:** https://docs.nestjs.com
- **React Docs:** https://react.dev
- **Tailwind CSS:** https://tailwindcss.com/docs (v3)
- **Vite Docs:** https://vitejs.dev

---

**Last Updated:** 2026-04-02
**Maintained By:** Development Team

For questions or clarifications, refer to this document first before making architectural decisions.
