# Perplexity Clone Roadmap

## Phase 1 (MVP) – Done
- Landing hero with quick prompts; chat layout with fixed bottom input.
- Light/dark theme toggle with persistence.
- Web search fetch (Brave → SerpAPI → mock), source carousel/cards.
- Gemini streaming answers with markdown; inline citations expectation.
- Auto follow-up suggestions after responses.
- Basic error/loading states.

## Phase 2 – Retrieval & Quality ✅ Done
- ✅ Add backend proxy for search APIs (hide keys, handle CORS, rate limits).
- ✅ Introduce retrieval/grounding (re-rank results, extractive snippets).
- ✅ Inline citation rendering tied to source indices; hover to preview snippet.
- ✅ Collapsible citations list at end of responses with source favicons.
- ✅ Response quality guardrails (citation validation, source coverage checks, quality scoring).
- ✅ Logging/telemetry of queries, latencies, and failures.
- ✅ Long-query–tolerant result filtering and mock-result detection (domain blacklist, URL/snippet quality scoring, user-facing mock-result warnings).

## Phase 3 – Conversations & Accounts ✅ Done
- ✅ Persistent conversations (save/reload threads).
- User auth (OAuth/provider); per-user rate limits and usage caps.
- ✅ Conversation settings: tone, depth, citation strictness.
- ✅ Share links to conversations; copy/export responses.

## Phase 4 – Advanced Query Experiences ✅ Done
- ✅ Query complexity analysis and automatic agent mode detection.
- ✅ Multi-hop/complex answering: plan-and-execute with multiple searches.
- ✅ Task planning and sequential search execution.
- ✅ Agent mode UI with thinking indicators, “Agent” badge, and live progress.
- ✅ Collapsible Agent Thinking panel with per-step search queries, result previews, and completion status.
- ✅ Streaming agent event log (thinking/progress/tool calls) rendered beneath the active answer.
- Structured outputs (tables, lists, timelines) and follow-up drill-down.
- Image support (render images from results; accept image inputs if model allows).

## Phase 5 – Pro Features & Ops
- Team workspaces, org billing, usage dashboards.
- Cached answers and fast-follow responses.
- Model routing/fallbacks; selective streaming vs. batch answers.
- Monitoring: quality evals, alerting on latency/error regressions.
- Accessibility hardening, mobile UX polish, localization.

## Phase 6 – Parity Polish
- Rich source attributions with highlights.
- Inline quote extraction and side-by-side source view.
- Voice input/output; keyboard-first shortcuts.
- Comprehensive test suite (unit, integration, E2E) and load testing.

