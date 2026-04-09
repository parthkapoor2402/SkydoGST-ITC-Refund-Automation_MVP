# Phase 2 — Parse pipeline, session stores, upload API

This folder indexes work **after** the Phase 1 scaffold/TDD baseline: **FIRA and invoice parsing** as domain modules, **in-memory session stores**, **REST routes**, and the **Upload** client flow. Canonical product phases 1B–1C in [`Architecture/Architecture.md`](../Architecture/Architecture.md) overlap here (parsers) and in [Phase 3](../Phase-3/README.md) (matching).

---

## Scope

| Area | What was delivered | Where to look |
|------|--------------------|---------------|
| **Domain** | Pure parsing logic (FIRA + invoice) | `server/src/modules/firaParser.ts`, `server/src/modules/invoiceParser.ts` |
| **Services** | Thin adapters / re-exports wired to modules | `server/src/services/firaParser.ts`, `server/src/services/invoiceParser.ts` |
| **Session** | Per-session parsed item storage | `server/src/services/firaSessionStore.ts`, `server/src/services/invoiceSessionStore.ts` |
| **API** | Multipart upload → parse → store | `server/src/routes/firaRoutes.ts` (`/api/fira`), `server/src/routes/invoiceRoutes.ts` (`/api/invoices`) |
| **Server entry** | Route mounts | `server/src/index.ts` — `app.use('/api/fira', …)`, `app.use('/api/invoices', …)` |
| **Client** | Upload step, structured dropzone, API helpers | `client/src/pages/Upload.tsx`, `client/src/components/ui/FileDropzone.tsx` (`variant="structured"`), `client/src/lib/gstApi.ts`, `client/src/lib/apiBase.ts` |
| **Types** | Shared shapes for parser / UI | `client/src/types/index.ts`, `client/src/types/parser.ts`; `server/src/types/index.ts` |

---

## Tests

- `server/src/__tests__/firaParser.test.ts`
- `server/src/__tests__/invoiceParser.test.ts`

```bash
cd server && npx vitest run src/__tests__/firaParser.test.ts src/__tests__/invoiceParser.test.ts --reporter=verbose
```

---

## Related

| Document | Purpose |
|----------|---------|
| [Phase 1](../Phase-1/README.md) | Original 1A–1F index and TDD layout |
| [Phase 3](../Phase-3/README.md) | Matching engine, Grok, match routes, Match Review UI |
| [`Architecture/Architecture.md`](../Architecture/Architecture.md) | Data models, API intent |
