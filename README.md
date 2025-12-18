# Perplexity Clone

AI-powered search & chat experience built with React, TypeScript, Vite, and Express.

## What's implemented

### Phase 1 (MVP) ✅
- Landing hero with quick-start prompts; fixed bottom input in the chat view.
- Light/dark theme toggle (persisted in localStorage).
- Web search pipeline (Brave → SerpAPI → mock fallback) with rich source cards and a dedicated “Sources” panel.
- Gemini streaming answers with markdown rendering and inline citations requirement.
- Follow-up suggestions auto-generated after a response.
- Error handling and loading states for search and streaming.

### Phase 2 (Retrieval & Quality) ✅
- **Backend API proxy** - Express server with search API proxy, rate limiting, and CORS.
- **Retrieval & grounding** - Re-ranking of search results by relevance, evidence extraction.
- **Inline citation rendering** - Interactive citations `[1]`, `[2]` with hover tooltips showing source previews.
- **Collapsible citations list** - Expandable sources section at end of responses with favicons in the header.
- **Quality guardrails** - Citation validation, source coverage checks, quality scoring, and warning UI.
- **Result quality & mock filtering** - Domain-aware quality scoring, URL/snippet quality checks, mock-result detection (e.g. `example.com`, contrived slugs), and user-facing “mock search results” banners when fallbacks are used.
- **Telemetry & logging** - Comprehensive logging of queries, latencies, failures, quality metrics, and search engine usage.

### Phase 3 (Conversations & Accounts) ✅
- **Persistent conversations** - Save and reload conversation threads with localStorage.
- **Conversation settings** - Adjustable tone (casual/professional/technical), depth (brief/detailed/comprehensive), and citation strictness.
- **Share & export** - Copy conversations to clipboard, export as Markdown, and generate share links.

### Phase 4 (Advanced Query Experiences) ✅
- **Query complexity analysis** - Automatic detection of complex queries requiring multi-step reasoning.
- **Agent mode** - Intelligent planning and execution of multi-hop searches for complex questions, including automatic long-query shortening for external search APIs.
- **Task planning** - Breaks down complex queries into sequential search tasks with dependency management.
- **Multi-hop search execution** - Executes multiple searches per step, aggregates results across steps, and feeds combined evidence into the LLM.
- **Agent UI indicators** - Visual feedback showing current thought, progress, and an “Agent” badge with animated typing during streaming.
- **Agent Thinking panel** - Collapsible panel that shows each planned step, its search query, number of results, and rich previews (title, domain, snippet, favicon, evidence).
- **Live agent event log** - Streaming timeline of agent thoughts, progress updates, and tool calls (e.g., `web_search` queries) rendered under the active answer.

## How it works

### Architecture Flow
1. User submits a query in `SearchBar`.
2. **Query analysis** - System analyzes query complexity to determine if agent mode is needed.
3. **Simple queries**: Standard search flow (steps 4-10).
4. **Complex queries (Agent Mode)**:
   - Query analyzer determines complexity and suggests steps.
   - Task planner breaks query into sequential search tasks.
   - Multi-hop executor runs searches sequentially, combining results.
   - Agent UI shows thinking process and progress.
5. Frontend calls backend `/api/search` endpoint (or falls back to direct API calls).
6. Backend performs search via Brave/SerpAPI, re-ranks results by relevance, extracts evidence snippets.
7. Search results are returned to the frontend as structured `SearchResult` objects and rendered as a collapsible `CitationsList` plus per-step entries in the `AgentThinkingPanel`.
8. `generateStreamingResponse` sends the user query and aggregated search context to Gemini, streaming tokens into the UI with a live “typing” indicator.
9. In Agent Mode, `agentService` emits thinking/progress/tool events which drive the on-page “Agent status” indicators and live event log.
10. Citations `[1]`, `[2]`, etc. in responses are rendered as interactive elements with hover tooltips and click-to-scroll behavior into the Sources panel.
11. Quality checks validate source coverage and citation presence; any issues are surfaced as non-blocking warnings above the answer.
12. On completion, the full assistant message is stored; `generateFollowUpSuggestions` generates 3 related questions.
13. Messages render in `ResultsArea` with markdown, interactive citations, the Agent Thinking panel, and a streaming agent log; follow-ups appear beneath.
14. Conversations (messages, sources, and settings) are auto-saved to localStorage, and telemetry events are sent to the backend for monitoring and analytics.

## Key files

### Frontend
- `src/App.tsx`: Orchestrates search, streaming, state, layout, telemetry, and agent mode.
- `src/services/searchService.ts`: Backend API client with fallback to direct calls.
- `src/services/geminiService.ts`: Gemini client, streaming + follow-up generation.
- `src/services/agentService.ts`: Agent orchestrator for multi-hop reasoning and task planning.
- `src/services/queryAnalyzer.ts`: Analyzes query complexity to determine agent mode.
- `src/services/taskPlanner.ts`: Breaks complex queries into sequential search tasks.
- `src/services/multiHopSearch.ts`: Executes multi-hop searches with sequential task execution.
- `src/services/conversationService.ts`: Conversation CRUD operations and localStorage management.
- `src/components/ResultsArea.tsx`: Message rendering with citation support and agent mode indicators.
- `src/components/MarkdownWithCitations.tsx`: Markdown renderer with inline citation processing.
- `src/components/CitationsList.tsx`: Collapsible citations list component with favicons.
- `src/components/Citation.tsx`: Citation component with hover tooltips.
- `src/components/ConversationSidebar.tsx`: Sidebar for managing saved conversations.
- `src/components/ConversationSettings.tsx`: Modal for adjusting conversation settings.
- `src/components/ConversationActions.tsx`: Share, copy, and export conversation actions.
- `src/utils/citationTooltips.ts`: Citation tooltip initialization utility (prevents duplicates).

### Backend
- `server/index.ts`: Express server setup, middleware, routing.
- `server/routes/search.ts`: Search API endpoint with retrieval and re-ranking.
- `server/routes/telemetry.ts`: Telemetry logging endpoint.
- `server/services/searchService.ts`: Search API clients (Brave/SerpAPI/mock).
- `server/services/retrievalService.ts`: Re-ranking, evidence extraction, quality validation.
- `server/services/qualityService.ts`: Response quality checks, citation validation, coverage scoring.
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
