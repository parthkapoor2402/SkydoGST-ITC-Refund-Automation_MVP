# Phase 5 — ZIP packaging, bundle buffer, download API, Download UI

This folder indexes **ZIP assembly** (manifest, originals, statement artifact), **temporary bundle storage**, **download route**, and the **Download** step in the client.

---

## Scope

| Area | What was delivered | Where to look |
|------|--------------------|---------------|
| **Domain** | ZIP creation helpers | `server/src/modules/zipPackager.ts` |
| **Session / buffer** | In-memory bundle before download | `server/src/services/bundleBufferStore.ts` |
| **API** | Trigger build + stream or fetch bundle | `server/src/routes/downloadRoutes.ts` (`/api/download`) |
| **Server entry** | Route mount | `server/src/index.ts` — `app.use('/api/download', …)` |
| **Client** | Final step UX | `client/src/pages/Download.tsx`, `client/src/lib/gstApi.ts` |

---

## Tests

There is no dedicated `zipPackager` Vitest file in the repo yet; validate via manual run (`npm run dev`) or add `server/src/__tests__/zipPackager.test.ts` when you want automated coverage.

---

## Related

| Document | Purpose |
|----------|---------|
| [Phase 4](../Phase-4/README.md) | Report payload that feeds export |
| [Phase 1](../Phase-1/README.md) | Original 1E “ZIP + CA bundle” planning note |
| [`Architecture/Architecture.md`](../Architecture/Architecture.md) | ZIP contents and manifest intent |
