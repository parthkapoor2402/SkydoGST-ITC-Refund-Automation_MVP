# Phase 1 — GST ITC Refund Automation MVP

This folder records **Phase 1** progress and where each step lives in the repo. The canonical phase definitions are in [`Architecture/Architecture.md`](../Architecture/Architecture.md) (§2 Phase-wise development plan: **1A–1F**).

---

## Phase map (1A–1F)

| Sub-phase | Scope (from architecture) | Status in repo | Where to look |
|-----------|-------------------------|----------------|----------------|
| **1A** | Project scaffold + design system | **In progress / largely done** | Root `package.json` workspaces, `client/`, `server/`, `client` Vite + Tailwind + React Router, `server` Express `/health` |
| **1B** | FIRA parser + Invoice parser | **TDD first** — tests + stubs | `server/src/__tests__/firaParser.test.ts`, `invoiceParser.test.ts`, `server/src/services/firaParser.ts`, `invoiceParser.ts`, fixtures in `server/src/__tests__/mocks/mockData.ts` |
| **1C** | Auto-matching engine + Grok fallback | **TDD first** — tests + stubs | `server/src/__tests__/matchingEngine.test.ts`, `server/src/services/matchingEngine.ts`, `grokClient.ts` (mocked in tests) |
| **1D** | RFD-01 Statement 3B generator | **TDD first** — tests + stubs | `server/src/__tests__/rfd01Generator.test.ts`, `server/src/services/rfd01Generator.ts` |
| **1E** | ZIP packaging + CA bundle | **Not started** | *(planned per architecture)* |
| **1F** | Integration tests + local run | **See test gate** | **[`Test-Suite-Step/README.md`](../Test-Suite-Step/README.md)** — Vitest (server/client), `src/__tests__/integration/`, Playwright `e2e/`, [`TEST_REPORT.md`](../Test-Suite-Step/TEST_REPORT.md) |

---

## Documented UI / layout step

Skydo-style dashboard UI (tokens, `AppShell`, pages, shared components) is summarized here:

- **[`UI-Design-Step/README.md`](../UI-Design-Step/README.md)**

## Documented test suite (1F gate)

Full unit / integration / E2E layout, runbook, and aggregate report:

- **[`Test-Suite-Step/README.md`](../Test-Suite-Step/README.md)** · [`TEST_REPORT.md`](../Test-Suite-Step/TEST_REPORT.md)

---

## TDD suite (tests before full implementation)

Vitest layout:

- **Server:** `server/vitest.config.ts` includes `src/__tests__/**/*.test.ts` and `tests/**/*.test.ts`.
- **Client:** `client/src/__tests__/components/*.test.tsx` (plus existing `App.test.tsx`).

Shared fixtures:

- **`server/src/__tests__/mocks/mockData.ts`** — mock FIRAs (USD/GBP/EUR + edge cases), invoices, golden matched pairs, unmatched scenarios.

Stub modules (minimal exports so imports resolve until implementations land):

- `server/src/services/firaParser.ts`
- `server/src/services/invoiceParser.ts`
- `server/src/services/matchingEngine.ts`
- `server/src/services/grokClient.ts`
- `server/src/services/rfd01Generator.ts`

Client:

- **`client/src/components/MatchReviewCard.tsx`** — placeholder pending real implementation (tests in `client/src/__tests__/components/MatchReviewCard.test.tsx`).
- **`client/src/components/ui/FileDropzone.tsx`** — rejection messaging + `aria-label="Upload errors"` for tests.

MSW (client test harness):

- `client/src/test/msw.ts`, wired in `client/src/test/setup.ts`.

**Run tests**

```bash
cd server && npx vitest run --reporter=verbose
cd client && npx vitest run --reporter=verbose
```

---

## Related docs

| Document | Purpose |
|----------|---------|
| [`Architecture/Architecture.md`](../Architecture/Architecture.md) | Full architecture, data models, folder plan |
| [`UI-Design-Step/README.md`](../UI-Design-Step/README.md) | UI design system & layout deliverable |
| [`Test-Suite-Step/README.md`](../Test-Suite-Step/README.md) | Unit / integration / E2E suite + [`TEST_REPORT.md`](../Test-Suite-Step/TEST_REPORT.md) |
| Root [`README.md`](../README.md) | Install, `npm run dev`, scripts |
| [`Phase-2/README.md`](../Phase-2/README.md) – [`Phase-5/README.md`](../Phase-5/README.md) | Post–Phase-1 implementation index (parse → match → report → download) |

---

*Update this README as you complete 1B–1F so Phase 1 stays the single index of “what’s done and where.”*
