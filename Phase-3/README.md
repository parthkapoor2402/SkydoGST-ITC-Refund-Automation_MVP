# Phase 3 — Matching engine, Grok, match API, Match Review UI

This folder indexes **deterministic matching** (tiers, scoring, exports), **Grok-backed disambiguation**, **match session state**, **match routes**, and the **Match Review** page.

---

## Scope

| Area | What was delivered | Where to look |
|------|--------------------|---------------|
| **Grok** | HTTP client for xAI completions | `server/src/lib/grokClient.ts`, `server/src/services/grokClient.ts` |
| **Domain** | Rule-based matcher + Grok fallback hooks | `server/src/modules/matchingEngine.ts` |
| **Services** | Service-layer matcher | `server/src/services/matchingEngine.ts` |
| **Session** | Stored match results / overrides | `server/src/services/matchingSessionStore.ts` |
| **API** | Run match, read/update state | `server/src/routes/matchingRoutes.ts` (`/api/match`) |
| **Server entry** | Route mount | `server/src/index.ts` — `app.use('/api/match', …)` |
| **Client** | Match table, overrides, query wiring | `client/src/pages/MatchReview.tsx`, `client/src/lib/matchUi.ts`, `client/src/lib/gstApi.ts`, `client/src/stores/useGSTStore.ts` |

Environment: Grok is configured via server `.env` as `GROK_API_KEY` (see `server/.env.example`).

---

## Tests

- `server/src/__tests__/matchingEngine.test.ts` (engine + mocked Grok where applicable)

```bash
cd server && npx vitest run src/__tests__/matchingEngine.test.ts --reporter=verbose
```

Client component tests (if present) under `client/src/__tests__/`.

---

## Related

| Document | Purpose |
|----------|---------|
| [Phase 2](../Phase-2/README.md) | Parsers and upload flow |
| [Phase 4](../Phase-4/README.md) | RFD-01 Statement 3B report generation |
| [`Architecture/Architecture.md`](../Architecture/Architecture.md) | Match semantics, models |
