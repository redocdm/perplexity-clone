# Perplexity Clone

AI-powered search & chat experience built with React, TypeScript, Vite, and Express.

## What's implemented

### Phase 1 (MVP) ✅
- Landing hero with quick-start prompts; fixed bottom input in chat view.
- Light/dark theme toggle (persisted in localStorage).
- Web search pipeline (Brave → SerpAPI → mock fallback) with source carousel/cards.
- Gemini streaming answers with markdown rendering and inline citations requirement.
- Follow-up suggestions auto-generated after a response.
- Error handling and loading states for search and streaming.

### Phase 2 (Retrieval & Quality) ✅
- **Backend API proxy** - Express server with search API proxy, rate limiting, and CORS.
- **Retrieval & grounding** - Re-ranking of search results by relevance, evidence extraction.
- **Inline citation rendering** - Interactive citations with hover tooltips showing source previews.
- **Quality guardrails** - Source validation, citation coverage checks, response quality monitoring.
- **Telemetry & logging** - Comprehensive logging of queries, latencies, failures, and performance metrics.

## How it works

### Architecture Flow
1. User submits a query in `SearchBar`.
2. Frontend calls backend `/api/search` endpoint (or falls back to direct API calls).
3. Backend performs search via Brave/SerpAPI, re-ranks results by relevance, extracts evidence snippets.
4. Search results displayed in `SourceCarousel` with enhanced metadata.
5. `generateStreamingResponse` sends query + search context to Gemini, streaming tokens into UI.
6. Citations `[1]`, `[2]` in responses are rendered as interactive elements with hover tooltips.
7. Quality checks validate source coverage and citation presence.
8. On completion, full assistant message stored; `generateFollowUpSuggestions` generates 3 related questions.
9. Messages render in `ResultsArea` with markdown and interactive citations; follow-ups appear beneath.
10. Telemetry events logged for monitoring and analytics.

## Key files

### Frontend
- `src/App.tsx`: Orchestrates search, streaming, state, layout, and telemetry.
- `src/services/searchService.ts`: Backend API client with fallback to direct calls.
- `src/services/geminiService.ts`: Gemini client, streaming + follow-up generation.
- `src/components/ResultsArea.tsx`: Message rendering with citation support.
- `src/components/MarkdownWithCitations.tsx`: Markdown renderer with citation processing.
- `src/components/Citation.tsx`: Citation component with hover tooltips.
- `src/utils/citationTooltips.ts`: Citation tooltip initialization utility.

### Backend
- `server/index.ts`: Express server setup, middleware, routing.
- `server/routes/search.ts`: Search API endpoint with retrieval and re-ranking.
- `server/routes/telemetry.ts`: Telemetry logging endpoint.
- `server/services/searchService.ts`: Search API clients (Brave/SerpAPI/mock).
- `server/services/retrievalService.ts`: Re-ranking, evidence extraction, quality validation.
- `server/utils/logger.ts`: Telemetry and logging utility.

## Running locally

### Prerequisites
- Node.js 18+ and npm
- At least one search API key (Brave or SerpAPI)
- Gemini API key

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env` (create it if it doesn't exist)
   - Add your API keys:
```bash
# Backend (server/.env or root .env)
BRAVE_SEARCH_KEY=your_brave_key_here
SERPAPI_KEY=your_serpapi_key_here
PORT=3001
FRONTEND_URL=http://localhost:5173

# Frontend (.env)
VITE_GEMINI_API_KEY=your_gemini_key_here
VITE_API_URL=http://localhost:3001  # Backend URL
```

3. **Run development servers:**

   **Option A: Run both frontend and backend together**
   ```bash
   npm run dev:all
   ```

   **Option B: Run separately**
   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Backend
   npm run dev:server
   ```

4. **Access the app:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Health check: http://localhost:3001/health

### Environment variables

**Backend (server/.env or root .env):**
- `BRAVE_SEARCH_KEY` — Optional; preferred search API (2000 searches/month free tier).
- `SERPAPI_KEY` — Optional; fallback search API (100 searches/month free tier).
- `PORT` — Backend server port (default: 3001).
- `FRONTEND_URL` — Frontend URL for CORS (default: http://localhost:5173).
- `NODE_ENV` — Environment mode (development/production).

**Frontend (.env):**
- `VITE_GEMINI_API_KEY` — Required for AI answers.
- `VITE_API_URL` — Backend API URL (default: http://localhost:3001).

**Note:** Without search API keys, the backend uses mock search results. Without `VITE_GEMINI_API_KEY`, the app won't generate answers.

## Roadmap
See `ROADMAP.md` for phased plan toward full Perplexity parity.
