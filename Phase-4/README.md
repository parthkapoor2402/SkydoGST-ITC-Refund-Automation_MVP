# Phase 4 — RFD-01 Statement 3B report generation

This folder indexes **mapping matched data → Statement 3B-style rows**, **report session storage**, **report API**, and the **Generate Report** (Step 3) UI: preview table, sorting, inline edits, and submission shape aligned with the server.

---

## Scope

| Area | What was delivered | Where to look |
|------|--------------------|---------------|
| **Domain** | Row builder / validation logic | `server/src/modules/rfd01Generator.ts` |
| **Services** | Generator service | `server/src/services/rfd01Generator.ts` |
| **Session** | Report payload for a session | `server/src/services/reportSessionStore.ts` |
| **API** | Build or fetch report body | `server/src/routes/reportRoutes.ts` (`/api/report`) |
| **Server entry** | Route mount | `server/src/index.ts` — `app.use('/api/report', …)` |
| **Client** | 14-column table, sort, edit, API types | `client/src/pages/GenerateReport.tsx`, `client/src/lib/gstApi.ts` (`ReportApiBody`, `version` / `generatedAt` / `statement`), `client/src/lib/gstMappers.ts` as needed |

---

## Tests

- `server/src/__tests__/rfd01Generator.test.ts`

```bash
cd server && npx vitest run src/__tests__/rfd01Generator.test.ts --reporter=verbose
```

---

## Related

| Document | Purpose |
|----------|---------|
| [Phase 3](../Phase-3/README.md) | Matching (input to report) |
| [Phase 5](../Phase-5/README.md) | ZIP bundle and download |
| [`Architecture/Architecture.md`](../Architecture/Architecture.md) | Statement 3B column intent |
