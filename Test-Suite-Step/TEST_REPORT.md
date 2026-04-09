# Test report — GST ITC Refund Automation MVP

Generated for Phase 1 completion gate: **0 failing tests** across unit, integration, and E2E.

**Index:** This file lives under [`Test-Suite-Step/`](README.md).

## Summary

| Metric | Value |
|--------|------:|
| **Total tests** | 68 |
| **Passing** | 68 |
| **Failing** | 0 |

### Breakdown

| Layer | Count | Command |
|-------|------:|---------|
| Server (Vitest — all server tests) | 51 | `cd server && npx vitest run --reporter=verbose` |
| Client unit | 12 | `cd client && npx vitest run --reporter=verbose` |
| E2E (Playwright) | 5 | `npx playwright test --config playwright.config.mjs --reporter=list` |

Raw combined log: [`test-results.txt`](../test-results.txt) (server unit + client + integration + E2E).

### Time to run full suite

Approximately **42 s** wall clock for unit + integration + E2E in one sequential run (see `FULL_SUITE_MS` footer in `test-results.txt`).  
Server-only coverage run (`npx vitest run --coverage` in `server/`) adds ~4–5 s.

---

## Coverage by module (server, line %)

Vitest + `@vitest/coverage-v8`, scoped to `src/modules/*.ts`:

| Module | Line coverage |
|--------|---------------:|
| **firaParser** | 54.3% |
| **invoiceParser** | 46.8% |
| **matchingEngine** | 69.3% |
| **rfd01Generator** | 90.1% |
| **zipPackager** | 99.2% |

Reproduce:

```bash
cd server && npx vitest run --coverage --reporter=verbose
```

Summary JSON: `server/coverage/coverage-summary.json` (gitignored with `coverage/`).

---

## E2E scenarios (Playwright)

All **5** scenarios in `e2e/tests/gst-refund-flow.spec.ts` **passing**:

1. Happy path — upload → match → approve → report → ZIP download  
2. Grok / AI-assisted suggestion (mocked via `E2E_MOCK_GROK` in `playwright.config.mjs`)  
3. Invalid FIRA JSON — toast + valid rows preserved  
4. Manual link — unmatched FIRA → select invoice  
5. Statement 3B column assertions (GSTIN, BRC/UTR, taxable, dates)

Use **`--config playwright.config.mjs`** so the dev server gets `E2E_MOCK_GROK` and related env for stable E2E.

---

## Failure fixed during this run

### E2E `beforeEach`: `POST /api/test/reset` not OK

1. **Error:** `expect(res.ok()).toBeTruthy()` received `false` (non-2xx on `/api/test/reset`).
2. **Root cause:** With `reuseExistingServer`, a server started without `ENABLE_TEST_ROUTES=1` did not register the test reset router, so reset returned **404**.
3. **Fix:** Mount `/api/test` reset routes when `NODE_ENV !== 'production'` or `ENABLE_TEST_ROUTES=1` (see `server/src/app.ts`).
4. **Confirmation:** All 5 Playwright tests pass; integration tests unchanged.

---

## Phase 1 gate

**Target met:** 0 failing tests before considering Phase 1 complete (unit + integration + E2E as defined above).
