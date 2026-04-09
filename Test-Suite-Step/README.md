# Test suite step — unit, integration, E2E

This folder is the **home for the QA / test-gate deliverable**: how the full suite is run, where tests live, and the latest aggregate report.

Canonical architecture reference: [`Architecture/Architecture.md`](../Architecture/Architecture.md) (Phase **1F** — integration tests, local run, E2E).

---

## Contents

| Item | Purpose |
|------|---------|
| **[`TEST_REPORT.md`](TEST_REPORT.md)** | Totals, coverage by server module, E2E scenarios, known fixes |
| Root [`test-results.txt`](../test-results.txt) | Optional combined verbose log (generated when you run the suite; may be gitignored) |

---

## Where tests live

| Layer | Location |
|-------|----------|
| **Server unit** | `server/src/__tests__/*.test.ts`, `server/tests/health.test.ts` |
| **Server integration** | `server/src/__tests__/integration/fullFlow.test.ts` |
| **Client unit** | `client/src/**/*.test.tsx` |
| **E2E (Playwright)** | `e2e/tests/gst-refund-flow.spec.ts`, fixtures under `e2e/fixtures/` |
| **Playwright config** | Root `playwright.config.mjs` |
| **Server coverage config** | `server/vitest.config.ts` (`coverage.include` → `src/modules/*`) |

---

## Run commands (quick reference)

From repository root unless noted.

```bash
# Server unit (exclude integration)
cd server && npx vitest run --reporter=verbose --exclude "src/__tests__/integration/**"

# Client unit
cd client && npx vitest run --reporter=verbose

# Integration
cd server && npx vitest run src/__tests__/integration/ --reporter=verbose

# E2E (starts dev server via config when needed)
npx playwright test --config playwright.config.mjs --reporter=list

# Server coverage (modules only)
cd server && npx vitest run --coverage --reporter=verbose
```

**Windows:** use `Tee-Object` instead of `tee` if you pipe output to a log file.

---

## Related docs

| Document | Purpose |
|----------|---------|
| [`Phase-1/README.md`](../Phase-1/README.md) | Phase 1 index (1A–1F) |
| [`UI-Design-Step/README.md`](../UI-Design-Step/README.md) | UI deliverable |
| [`Phase-2/README.md`](../Phase-2/README.md) – [`Phase-5/README.md`](../Phase-5/README.md) | Implementation phases after scaffold |

---

*Regenerate [`TEST_REPORT.md`](TEST_REPORT.md) after major test or coverage changes.*
