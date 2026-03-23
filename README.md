# AI Trading Platform

A monorepo for the AI Trading Platform.

## Structure

- `packages/web` - React + TypeScript + Vite frontend
- `packages/backend` - NestJS TypeScript backend
- `packages/shared` - Shared TypeScript utilities and types

## Tech Stack

### Web
- React 19
- TypeScript
- Vite
- Shared package integration

### Backend
- NestJS 11
- TypeScript
- Express
- Swagger/OpenAPI
- Shared package integration

## Getting Started

### 1. Install dependencies
```bash
yarn install
```

### 2. Run development servers

Start both web and API servers:
```bash
yarn dev
```

Or run them individually:
```bash
yarn web dev      # Web on http://localhost:3000
yarn backend dev  # API on http://localhost:4000/api
```

## API Documentation

The backend API is available at http://localhost:4000/api

**Swagger UI**: http://localhost:4000/api/docs

### API Endpoints

- `GET /api` - API info
- `GET /api/health` - Health check
- `GET /api/test` - Test endpoint with shared package integration

## Development

### Web Package
The web package uses Vite with React and TypeScript. Hot reload is enabled.

### Backend Package
The backend uses NestJS with TypeScript. Auto-reload is enabled in development mode.

## Build for Production

Build all packages:
```bash
yarn web build
yarn backend build
```
