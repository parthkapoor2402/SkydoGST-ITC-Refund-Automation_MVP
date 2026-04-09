# GST ITC Refund Automation — MVP Architecture

**Product context:** MVP web app aligned with [Skydo](https://www.skydo.com/)’s domain — Indian service exporters receive FIRA for inward remittances and issue export invoices; claiming GST ITC refund via **Form GST RFD-01** requires matching each remittance proof to invoices and compiling annexure data. This document defines architecture, phases, data models, repo layout, Grok usage, and tests.

**Stack (target):** React 18 + TypeScript + Vite + Tailwind v3 (client); Node.js + Express + TypeScript (server); Grok via `openai` package (`baseURL: https://api.x.ai/v1`, model `grok-3-mini`); Vitest + Playwright; no DB — in-memory server state + `localStorage` for session.

---

## 1. System architecture diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (React + Vite)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Upload UI    │  │ Match review │  │ RFD preview  │  │ Download ZIP         │ │
│  │ (FIRA/Inv)   │  │ + overrides  │  │ + validation │  │ (CA bundle)          │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘ │
│         │                 │                 │                      │             │
│         │    localStorage: session id, last match state (optional cache)       │
│         └────────────────┼─────────────────┼──────────────────────┘             │
└──────────────────────────┼─────────────────┼────────────────────────────────────┘
                           │ REST/JSON       │
                           ▼                 │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    EXPRESS API (Node + TypeScript)                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │ Session middleware — in-memory Map<sessionId, SessionState>                 │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐ │
│  │ POST       │ │ POST       │ │ POST       │ │ GET        │ │ GET              │ │
│  │ /session   │ │ /parse/    │ │ /parse/    │ │ /match     │ │ /export/zip      │ │
│  │            │ │ fira       │ │ invoice    │ │            │ │                  │ │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └────────┬─────────┘ │
│        │              │              │              │                 │          │
│        ▼              ▼              ▼              ▼                 ▼          │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         DOMAIN MODULES (pure TS where possible)           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  ┌───────────────┐ │   │
│  │  │ FIRA        │  │ Invoice     │  │ Matching        │  │ RFD-01 Stmt   │ │   │
│  │  │ parser      │  │ parser      │  │ engine          │  │ 3B generator  │ │   │
│  │  │ (PDF/text/  │  │ (PDF/CSV/   │  │ (rules + score  │  │ (rows + CSV/  │ │   │
│  │  │  OCR hook)  │  │  XLSX)      │  │  + Grok fallback)│  │  XLSX template)│ │   │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  └───────┬───────┘ │   │
│  │         │                │                  │                    │         │   │
│  │         └────────────────┴──────────────────┴────────────────────┘         │   │
│  │                                    │                                        │   │
│  │                         ┌──────────▼──────────┐                             │   │
│  │                         │ ZIP bundler         │                             │   │
│  │                         │ (archiver + manifest│                             │   │
│  │                         │ + originals copy)   │                             │   │
│  │                         └──────────┬──────────┘                             │   │
│  └────────────────────────────────────┼────────────────────────────────────────┘   │
│                                       │                                           │
│  ┌────────────────────────────────────▼────────────────────────────────────────┐ │
│  │ Grok client (openai SDK, baseURL api.x.ai/v1, model grok-3-mini)             │ │
│  │ — structured JSON: match suggestions, entity normalization, low-confidence    │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ https://api.x.ai/v1    │
              │ (Grok chat completions) │
              └────────────────────────┘

DATA FLOW (happy path)
======================
1. Client POST /session → server returns sessionId → client stores in localStorage.
2. Client uploads FIRA file(s) → POST /parse/fira (multipart) → normalized FiraRecord[] in session.
3. Client uploads invoice file(s) → POST /parse/invoice → normalized InvoiceRecord[] in session.
4. Client POST /match (optional flags: date window, amount tolerance) → rule engine scores pairs;
   if confidence low / ties → Grok proposes match or "unmatched" with rationale → MatchResult[] stored.
5. User adjustments (optional) PATCH /match — updates manual overrides in session.
6. GET /export/preview → RFD-01 Statement 3B rows + validation errors.
7. GET /export/zip → ZIP stream: Statement3B.csv (or .xlsx), manifest.json, /originals/*, README_CA.txt.

FILE GENERATION PIPELINE
========================
Parsed entities → Match graph (FIRA ↔ Invoice) → Statement 3B row builder (one row per
matched pair or per business rule) → serializer (CSV/XLSX) → archiver adds sources + checksums.
```

---

## 2. Phase-wise development plan

| Phase | Scope | Week | Deliverables |
|--------|--------|------|----------------|
| **1A** | Project scaffold + design system | 1 | Monorepo (`/client`, `/server`), shared `types` package optional, ESLint/Prettier, Tailwind design tokens (colors, type, spacing), base layout (header, stepper: Upload → Match → RFD → Download), empty API health route. |
| **1B** | FIRA parser + Invoice parser | 1–2 | Upload endpoints, file type detection, PDF text extraction (e.g. `pdf-parse` or similar), CSV/XLSX parsing for invoices, normalized `FiraRecord` / `InvoiceRecord`, parse error reporting per file, Vitest fixtures (sample PDFs redacted). |
| **1C** | Auto-matching engine + Grok fallback | 2–3 | Deterministic matcher: amount equality (with FX tolerance config), date proximity window, client name token overlap / fuzzy ratio; confidence score; Grok for disambiguation and name normalization; API: `/match`, manual override shape; UI table with accept/reject. |
| **1D** | RFD-01 Statement 3B generator | 3–4 | Map matched pairs → **Statement 3B row** (columns per §3 below); validation (GSTIN format, date formats DD-MM-YYYY for export, numeric consistency taxable + IGST ≤ invoice value where applicable); preview table + downloadable CSV/XLSX. |
| **1E** | ZIP packaging + CA bundle | 4–5 | `manifest.json` (app version, generatedAt, row count, file list, sha256), folder `originals/` with uploaded files, `Statement3B.csv`, `README_CA.txt` (filing notes + disclaimer), streaming ZIP response. |
| **1F** | Integration tests + local run | 5–6 | Vitest integration tests against Express app (supertest); Playwright E2E: upload → match → export; single-command `dev` (concurrently client + server); README runbook (no DB). |

---

## 3. Data models (TypeScript interfaces)

*Field names are MVP-oriented; dates in storage as ISO `string` internally, formatted to **DD-MM-YYYY** in RFD export per common GST utility conventions.*

### 3.1 FIRA (`FiraRecord`)

Foreign Inward Remittance Advice — fields typically derivable from bank/Skydo FIRA PDFs (exact PDF mapping is implementation detail in 1B).

```typescript
interface FiraRecord {
  id: string;                          // stable UUID per upload
  sourceFileName: string;
  /** Amount in INR as credited (or as stated on FIRA) */
  amountInr: number;
  /** Value date / credit date on advice */
  valueDate: string;                   // ISO 8601 date
  /** Payer/remitter name as on document */
  remitterNameRaw: string;
  remitterNameNormalized?: string;     // filled by rules or Grok
  /** FIRA / reference number on document */
  referenceNo: string;
  /** Narration or purpose if present */
  narration?: string;
  currencyOriginal?: string;           // e.g. USD
  amountOriginal?: number;
  parseConfidence: number;             // 0–1 from parser
  rawExcerpt?: string;                 // short text snippet for audit
}
```

### 3.2 Invoice (`InvoiceRecord`)

Export tax invoice (service exporter).

```typescript
interface InvoiceRecord {
  id: string;
  sourceFileName: string;
  /** Supplier = exporter GSTIN (applicant) */
  supplierGstin: string;
  invoiceNo: string;
  invoiceDate: string;                 // ISO 8601
  /** Invoice value (including tax) as per invoice */
  invoiceValue: number;
  /** Taxable value for the line / supply */
  taxableValue: number;
  /** Integrated tax (IGST) amount */
  integratedTax: number;
  /** Buyer/client name as on invoice */
  clientNameRaw: string;
  clientNameNormalized?: string;
  currency?: string;
  parseConfidence: number;
  rawExcerpt?: string;
}
```

### 3.3 Match result (`MatchResult`)

```typescript
type MatchStatus = 'auto_accepted' | 'auto_suggested' | 'manual' | 'unmatched';

interface MatchResult {
  id: string;
  firaId: string;
  invoiceId: string | null;          // null if unmatched
  status: MatchStatus;
  /** 0–1 combined score from rules */
  confidence: number;
  scoreBreakdown: {
    amount: number;
    dateProximity: number;
    nameSimilarity: number;
  };
  grok?: {
    used: boolean;
    rationale?: string;
    normalizedRemitter?: string;
    normalizedClient?: string;
  };
  userOverridden?: boolean;
}
```

### 3.4 RFD-01 Statement 3B row (GST-prescribed column set)

**Naming note:** On the GST portal / offline utilities, the annexure for **refund of unutilised ITC on zero-rated supplies (e.g. export of services) without payment of tax** is commonly filed as **Statement 3**, with **Statement 3A** derived for refund computation. Product and CA workflows sometimes refer to the **invoice–remittance linkage grid** as “Statement 3B” in internal checklists. This MVP implements the **exact column set** required for that linkage table, aligned with **Form GST RFD-01** annexure expectations: invoice particulars plus **BRC/FIRC** (Bank Realisation Certificate / Foreign Inward Remittance Certificate) references that tie receipt of export proceeds to the invoice.

**Canonical export columns (order fixed for CSV/XLSX):**

| # | Column (header) | Description |
|---|-----------------|-------------|
| 1 | GSTIN of supplier | Applicant’s GSTIN (exporter) — 15 chars |
| 2 | Invoice No. | Tax invoice number |
| 3 | Invoice Date | DD-MM-YYYY |
| 4 | Invoice Value | Numeric (typically 2 decimal places) |
| 5 | Taxable Value | Numeric |
| 6 | Integrated Tax | IGST amount (numeric) |
| 7 | BRC/FIRC No. | Number from BRC or FIRA/FIRC advice (as per Rule 89 documentation practice) |
| 8 | BRC/FIRC Date | DD-MM-YYYY |

```typescript
interface Rfd01Statement3BRow {
  gstinOfSupplier: string;
  invoiceNo: string;
  invoiceDate: string;       // DD-MM-YYYY in export
  invoiceValue: number;
  taxableValue: number;
  integratedTax: number;
  brcFircNo: string;         // maps from FIRA reference / certificate number
  brcFircDate: string;       // DD-MM-YYYY — maps from FIRA value date
}

interface Rfd01Statement3BExport {
  rows: Rfd01Statement3BRow[];
  /** Row-level validation messages for CA review */
  validationWarnings: Array<{ rowIndex: number; code: string; message: string }>;
}
```

**Mapping from match:** For each accepted `MatchResult` with both `firaId` and `invoiceId`, populate invoice fields from `InvoiceRecord` and BRC/FIRC fields from the matched `FiraRecord` (`referenceNo` → `brcFircNo`, `valueDate` → `brcFircDate` after formatting). Unmatched FIRAs or invoices are listed in `manifest.json` under `exceptions` for CA follow-up.

---

## 4. Folder structure (monorepo)

```
/
├── Architecture/
│   └── Architecture.md              # this document
├── client/
│   ├── public/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/              # UI primitives + feature components
│   │   ├── pages/                   # Upload, Match, RfdPreview, Download
│   │   ├── hooks/
│   │   ├── api/                     # fetch wrappers to server
│   │   ├── lib/                     # client-only utils
│   │   └── styles/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── package.json
├── server/
│   ├── src/
│   │   ├── index.ts                 # app entry
│   │   ├── app.ts                   # express setup
│   │   ├── routes/
│   │   │   ├── session.ts
│   │   │   ├── parse.ts
│   │   │   ├── match.ts
│   │   │   └── export.ts
│   │   ├── middleware/
│   │   │   └── session.ts
│   │   ├── services/
│   │   │   ├── sessionStore.ts      # in-memory Map
│   │   │   ├── firaParser.ts
│   │   │   ├── invoiceParser.ts
│   │   │   ├── matchingEngine.ts
│   │   │   ├── grokClient.ts
│   │   │   ├── rfdStatement3b.ts
│   │   │   └── zipBundle.ts
│   │   ├── types/
│   │   │   └── domain.ts            # mirrors §3 interfaces
│   │   └── utils/
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── tsconfig.json
│   └── package.json
├── e2e/                             # Playwright (root or client — team choice)
│   ├── playwright.config.ts
│   └── tests/
├── package.json                     # optional workspaces root
├── pnpm-workspace.yaml / turbo.json # optional
└── README.md
```

---

## 5. Grok API usage plan

**Client:** `openai` npm package, `baseURL: 'https://api.x.ai/v1'`, `apiKey` from env (`XAI_API_KEY`), model **`grok-3-mini`**.

| Call site | Trigger | Input (prompt / messages) | Output (structured) | Errors |
|-----------|---------|---------------------------|------------------------|--------|
| **A. Name normalization** | After parse, before match | System: JSON-only assistant; User: remitter + client names + optional country/context | `{ "remitterNormalized": string, "clientNormalized": string }` | Fallback: heuristic tokenization |
| **B. Match disambiguation** | Multiple invoices within tolerance for one FIRA (or symmetric tie) | System: JSON-only; User: compact JSON array of candidates (amount, date, names, ids) | `{ "chosenInvoiceId": string | null, "confidence": number, "rationale": string }` | Fallback: highest rule score + flag `auto_suggested` |
| **C. Unmatched resolution** | Batch of unmatched FIRAs + remaining invoices | System: JSON-only; User: lists of unmatched entities | Array of `{ firaId, invoiceId | null, rationale }` | Partial apply + manual UI |
| **D. Optional: parse assist** | Low `parseConfidence` from PDF | Redacted text snippet only | Suggested fields object | Never auto-commit without user confirm |

**Prompt constraints:** Require **valid JSON** output; cap token length; no raw PII beyond what user uploaded; temperature low (e.g. 0.2) for determinism.

**Tests — what to mock:**

- **Unit:** `grokClient.ts` — mock HTTP or inject fake client returning fixtures.
- **Integration:** Mock Grok for all routes that *can* call Grok (default OFF via `GROK_ENABLED=false`); one optional test with recorded fixture (VCR-style) if needed.
- **E2E:** Grok disabled; use deterministic match data seeded via API or fixtures.

---

## 6. Test strategy

### 6.1 Unit coverage targets (by module)

| Module | Target focus | Approx. coverage goal |
|--------|----------------|------------------------|
| `firaParser` | Amount/date/reference extraction, corrupt PDF | ≥ 85% branches |
| `invoiceParser` | CSV/XLSX columns mapping, GSTIN validation | ≥ 85% |
| `matchingEngine` | Scoring, tolerance, one-to-one constraint | ≥ 90% |
| `grokClient` | JSON parse, retry, timeout | ≥ 80% |
| `rfdStatement3b` | Column order, DD-MM-YYYY, rounding | ≥ 90% |
| `zipBundle` | manifest checksums, file list | ≥ 80% |
| Express routes | 4xx on bad session, multipart limits | ≥ 75% |

### 6.2 Integration scenarios (minimum 5)

1. **Happy path:** 3 FIRAs + 3 invoices, perfect amounts/dates → 3 rows, ZIP contains 8 columns + manifest.
2. **Tolerance:** 1 INR rounding difference → still matches within config.
3. **Tie + Grok off:** Two candidates → `auto_suggested` or unmatched per policy; UI state consistent.
4. **Partial upload:** Invoices without matching FIRA → warnings + `exceptions` in manifest.
5. **Invalid GSTIN:** Parser accepts but RFD generator emits validation warning, row still exportable with flag.
6. **Session expiry / invalid session:** Clear 401/404 and client recovery (bonus sixth scenario).

### 6.3 Mock data needed

- **Redacted sample FIRA PDFs** (2–3 patterns: different banks/layouts).
- **Invoice CSV/XLSX** with known GSTIN, IGST split, multiple clients.
- **Edge cases:** same amount different dates; same client name spelling variants; multi-currency narration.
- **Grok fixtures:** JSON files with normalized responses for tests.
- **Golden file:** `Statement3B.csv` expected bytes for integration assert.

---

## 7. References (external)

- Skydo product context: [skydo.com](https://www.skydo.com/)
- Form GST RFD-01 and refund annexures: refer to official GST portal / CBIC notifications and the latest offline utility column headers when locking CSV templates for production (portal labels may use **Statement 3** / **3A** naming).

---

*Document version: MVP planning. Implementation should verify final column headers against the utility version the CA uses at filing time.*
