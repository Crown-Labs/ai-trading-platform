# Backend API

NestJS backend for AI Trading Platform.

## Tech Stack

- NestJS 11
- TypeScript
- Express
- Swagger/OpenAPI

## Development

Run the development server:
```bash
yarn dev
```

Or from the root:
```bash
yarn backend dev
```

The API will be available at http://localhost:4000/api

## API Documentation

Once running, access the interactive Swagger UI:
- **Swagger UI**: http://localhost:4000/api/docs

The Swagger documentation provides:
- Interactive API testing
- Request/response schemas
- Example values
- Try it out functionality

## Available Scripts

- `yarn dev` - Start development server with hot reload
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn start:debug` - Start with debugging

## API Endpoints

All endpoints are prefixed with `/api`:

- `GET /api` - API info
- `GET /api/health` - Health check
- `GET /api/test` - Test endpoint with shared package integration

## Project Structure

```
src/
├── main.ts              # Application entry point with Swagger setup
├── app.module.ts        # Root module
├── app.controller.ts    # Root controller with Swagger decorators
├── app.service.ts       # Root service
└── dto/                 # Data Transfer Objects
    ├── api-info.dto.ts
    ├── health.dto.ts
    └── test-data.dto.ts
```
