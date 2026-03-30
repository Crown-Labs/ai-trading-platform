# AI Trading Platform - Team Collaboration Rules

This document provides guidelines for AI assistants (like Claude, Openclaw, etc.) working on this project.

## Project Overview

**Type:** Monorepo (Yarn Workspaces)
**Purpose:** AI-powered trading platform with web frontend and API backend

### Architecture

```
ai-trading-platform/
├── packages/
│   ├── web/                # React + TypeScript + Vite frontend
│   ├── backend/            # NestJS + TypeScript API
│   ├── shared/             # Shared TypeScript utilities & types
│   └── claude-code-proxy/  # NestJS proxy for Claude Code API
├── package.json      # Root workspace configuration
└── CLAUDE.md        # This file
```

### Tech Stack

**Frontend (Web)**
- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS v3 for styling
- Custom dark theme design

**Backend (API)**
- NestJS 11 with TypeScript
- Express as HTTP server
- Swagger/OpenAPI documentation
- Port 4000 with `/api` prefix

**Shared**
- TypeScript utilities and types
- Shared between web and backend
- CommonJS module format

**Claude Code Proxy (`@ai-trading/claude-code-proxy`)**
- NestJS proxy server for Claude Code API
- Runs on port 3001 (configurable via `PORT` env var)
- Per-user proxy key authentication (SHA-256 hashed)
- Redis-based rate limiting (sliding window)
- Usage tracking with PostgreSQL (tokens + cost)
- SSE streaming support
- Admin API with Swagger docs at `/docs`
- Requires PostgreSQL and Redis (docker-compose provided in package directory)

## Development Commands

```bash
# Install dependencies
yarn install

# Run both web and backend concurrently
yarn dev

# Run individually
yarn web dev      # http://localhost:3000
yarn backend dev  # http://localhost:4000/api

# Run claude-code-proxy
yarn proxy dev    # http://localhost:3001

# Build
yarn web build
yarn backend build
yarn proxy build
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
├── app.module.ts          # Root module
├── app.controller.ts      # Controllers with Swagger decorators
├── app.service.ts         # Business logic
└── dto/                   # Data Transfer Objects
    ├── *.dto.ts           # DTOs with @ApiProperty decorators
    └── index.ts           # Barrel exports
```

**Creating New Endpoints:**
1. Create DTO in `dto/` folder with Swagger decorators
2. Add method to service with proper return type
3. Add controller method with:
   - `@ApiOperation()` for description
   - `@ApiResponse()` for response schema
   - `@ApiTags()` for grouping
4. Use proper TypeScript return types

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
- Enable CORS for `http://localhost:3000`

### Frontend (React + Vite)

**File Structure:**
```
packages/web/src/
├── main.tsx              # React entry point
├── App.tsx               # Main app component
├── index.css             # Tailwind directives & global styles
└── components/           # Reusable components
    ├── Header.tsx
    ├── StatCard.tsx
    └── MarketCard.tsx
```

**Creating New Components:**
1. Create in `components/` folder
2. Use TypeScript with proper prop types
3. Use Tailwind CSS classes (no inline styles)
4. Export as default

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
- Use fetch or axios
- Handle loading and error states
- Type responses with DTOs from shared package

## Common Tasks

### Adding a New API Endpoint

1. Create DTO in `packages/backend/src/dto/my-feature.dto.ts`
2. Add service method in `app.service.ts`
3. Add controller method in `app.controller.ts` with Swagger decorators
4. Export DTO from `dto/index.ts`
5. Optionally add DTO to shared package if frontend needs it

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

## Testing

### Before Committing

1. Run `yarn dev` and verify:
   - Web loads at http://localhost:3000
   - Backend runs at http://localhost:4000/api
   - Swagger docs at http://localhost:4000/api/docs
   - No console errors

2. Check API integration:
   - Web can fetch from backend
   - CORS is working
   - Data displays correctly

3. Verify responsive design:
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

**Last Updated:** 2026-03-23
**Maintained By:** Development Team

For questions or clarifications, refer to this document first before making architectural decisions.
