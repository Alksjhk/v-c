# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack real-time chat application with user authentication, room management, and file upload capabilities.

**Architecture:** Two-part system
- **Backend** (`/v-c/`): Express.js + TypeScript server (port 3001)
- **Frontend** (`/v-c/clinet/`): React + Vite + TypeScript SPA (port 5173)

## Development Commands

### Backend (root directory)
```bash
# Development with hot reload
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Reset database (development only - clears all data)
bun run reset-db
```

### Frontend (clinet directory)
```bash
# Development with Vite dev server
bun run dev

# Build for production
bun run build
```

### Running a Single Test
The project uses Vitest. To run a specific test file:
```bash
bun run test src/path/to/test.spec.ts
```

## Code Architecture

### Backend Structure (`/v-c/src/`)

**Controllers** (`src/controllers/`):
- `authController.ts` - User registration, login, session verification, logout
- `roomController.ts` - Room creation, joining, public room listing
- `messageController.ts` - Message sending and retrieval
- `fileController.ts` - File upload with compression
- `sseController.ts` - Server-Sent Events for real-time messaging

**Routes** (`src/routes/`):
- Route definitions with auth middleware applied to protected endpoints

**Database** (`src/database/`):
- `init.ts` - Database schema initialization (users_auth, sessions, rooms, user_status, messages tables)
- `cleanup.ts` - Graceful shutdown handling

**Middleware** (`src/middleware/`):
- `auth.ts` - Session-based authentication using cookies

**Key Patterns:**
- Session-based auth with `session_id` cookies
- Rate limiting: 10 requests/minute per IP
- SSE for real-time updates (auto-reconnect with exponential backoff)
- Graceful shutdown on SIGTERM/SIGINT

### Frontend Structure (`/v-c/clinet/src/`)

**State Management** (`src/context/`):
- `ChatContext.tsx` - Central state using React Context + useReducer pattern
- Manages: rooms, messages, online users, connection status, pending messages

**Components** (`src/components/`):
- `Auth/` - Login and registration forms
- `Chat/` - Main chat interface with message list and input
- `Room/` - Room selection and creation
- Shared UI components (Button, Input, Modal, etc.)

**Utilities** (`src/utils/`):
- `api.ts` - Axios client with auth/rate limit interceptors
- `SSEManager.ts` - SSE connection management with auto-reconnect
- `imageUtils.ts` - Image compression and preview utilities

**Types** (`src/types/`):
- TypeScript interfaces for API responses, chat entities, and state

**Key Patterns:**
- Optimistic UI updates (temporary IDs for immediate feedback)
- Image preloading for better UX
- Session persistence via localStorage
- CSS Modules for scoped styling
- Vite proxy configured for `/api` and `/uploads` to backend

### Database Schema

**Tables:**
- `users_auth` - User credentials (unique_id, username, password_hash)
- `sessions` - Active sessions (user_id, session_id, expires_at)
- `rooms` - Chat rooms (room_code, room_name, is_public)
- `user_status` - Online status tracking
- `messages` - Chat messages (room_id, user_id, content, message_type, file_url)

## API Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (sets session cookie)
- `GET /api/auth/verify/:sessionId` - Verify session validity
- `POST /api/auth/logout` - Logout (clears session)

**Rooms:**
- `GET /api/rooms/public` - List public rooms (requires auth)
- `POST /api/rooms/create` - Create new room (requires auth)
- `GET /api/rooms/join/:roomCode` - Join room by code (requires auth)

**Messages:**
- `POST /api/messages/send` - Send message (requires auth)
- `GET /api/messages/:roomId` - Get message history (requires auth)
- `GET /api/messages/:roomId/latest` - Get recent messages (requires auth)

**SSE (Real-time):**
- `GET /api/sse/:roomId` - SSE connection for real-time updates (requires auth)
- `GET /api/sse/stats` - Connection statistics (requires auth)

**Files:**
- `POST /api/files/upload` - File upload with compression (requires auth)
- `GET /uploads/*` - Static file serving

**Health:**
- `GET /health` - Health check endpoint

## Environment Configuration

**Backend (.env):**
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `POSTGRES_URL` - PostgreSQL connection string
- `CORS_ORIGIN` - Comma-separated allowed CORS origins

**Frontend (.env.development / .env.production):**
- `VITE_API_BASE_URL` - Backend API URL for production
- `VITE_NODE_ENV` - Environment type
- `VITE_ENABLE_LOGGING` - Enable API request logging
- `VITE_ENABLE_DEBUG` - Enable debug mode

## Development Workflow

1. Start backend: `cd /v-c && bun run dev`
2. Start frontend: `cd /v-c/clinet && bun run dev`
3. Access at: http://localhost:5173

The Vite dev server proxies `/api` and `/uploads` to the backend at `http://localhost:3001`.

## Important Files

- **Backend Entry**: `/v-c/src/app.ts`
- **Frontend Entry**: `/v-c/clinet/src/main.tsx`
- **State Management**: `/v-c/clinet/src/context/ChatContext.tsx`
- **API Client**: `/v-c/clinet/src/utils/api.ts`
- **SSE Manager**: `/v-c/clinet/src/utils/SSEManager.ts`
- **Database Init**: `/v-c/src/database/init.ts`
- **Vite Config**: `/v-c/clinet/vite.config.ts`
- **TypeScript Configs**: `/v-c/tsconfig.json`, `/v-c/clinet/tsconfig.json`
