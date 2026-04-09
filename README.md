# Skydo GST ITC Refund Automation

## What This Does

This web app helps Indian exporters who receive **FIRAs** (Foreign Inward Remittance Advice) from Skydo **match** those remittances to their **export invoices**, then **build the data** needed for **GST RFD-01** (Statement 3B style) and **download a ZIP bundle** for their chartered accountant. You upload Skydo exports, review suggested matches (including optional AI help when the rules are unsure), fix anything that needs a human eye, and export a structured package instead of juggling spreadsheets by hand.

## Why It Exists

Many eligible **GST ITC refunds**—often **₹50,000+** per quarter for active exporters—stay **unclaimed** because **manually pairing FIRAs to invoices** is slow, error-prone, and easy to defer. This MVP automates the **first mile**: normalized uploads, **rule-based + fuzzy matching** with a **Grok (xAI) fallback** for ambiguous cases, **RFD-01 Statement 3B–oriented rows**, and a **CA-ready ZIP** so filing prep is repeatable and auditable.

## Quick Start

**Prerequisites:** Node **18+**, **npm**, and a **Grok API key** ([xAI console](https://console.x.ai) — free tier available).

```bash
git clone <your-fork-or-repo-url>.git
cd SkydoGST-ITC-Refund-Automation_MVP
chmod +x scripts/setup.sh   # Unix / macOS / WSL
./scripts/setup.sh
```

Then add **`GROK_API_KEY`** to **`server/.env`** (created from `server/.env.example`).

```bash
npm run dev
```

- **App:** [http://localhost:5173](http://localhost:5173)  
- **API health:** [http://localhost:3001/api/health](http://localhost:3001/api/health) → `{ "status": "ok", "version": "1.0.0" }`  
- **Legacy health:** `GET http://localhost:3001/health` → `{ "ok": true }`

**Windows (without Bash):** install dependencies with `npm install`, copy `client/.env.example` → `client/.env` and `server/.env.example` → `server/.env`, set `GROK_API_KEY`, then `npm run dev`.

## How to Use (3 Steps)

1. **Export FIRAs from Skydo** → upload JSON/CSV on **Step 1: Upload**.  
2. **Export invoices from Skydo** → upload JSON/CSV on the same step.  
3. **Review matches** → approve or override → **Generate report** (Statement 3B table) → **Download CA bundle** (ZIP).

Full test and coverage details: [`Test-Suite-Step/README.md`](Test-Suite-Step/README.md).

## Architecture

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
```

*MVP routes use `/api/fira`, `/api/invoices`, `/api/match`, `/api/report`, `/api/download` — see [`Architecture/Architecture.md`](Architecture/Architecture.md) for data models and phase plan.*

## Test Results

| Metric | Value |
|--------|------:|
| **Total tests** | 68 |
| **Passing** | 68 |
| **Failing** | 0 |

| Layer | Count |
|-------|------:|
| Server (Vitest — unit + integration + health) | 51 |
| Client unit | 12 |
| E2E (Playwright) | 5 |

**Server module line coverage** (Vitest + v8, `src/modules/*`): firaParser ~54%, invoiceParser ~47%, matchingEngine ~69%, rfd01Generator ~90%, zipPackager ~99%.  
Details: [`Test-Suite-Step/TEST_REPORT.md`](Test-Suite-Step/TEST_REPORT.md).

## Phase Roadmap

| Phase | Scope |
|-------|--------|
| **Phase 1 (this repo)** | FIRA ↔ invoice matching, RFD-01 Statement 3B generation, CA bundle ZIP, local + CI test gate |
| **Phase 2 (next)** | ClearTax (or similar) API integration for **direct portal submission** workflows |
| **Phase 3 (future)** | GSP license path + **one-click end-to-end filing** where regulations and partnerships allow |

## Monorepo layout

- `client/` — React (Vite), Tailwind, Vitest, Playwright (E2E config at repo root)  
- `server/` — Express, TypeScript, Vitest, Supertest  
- `e2e/` — Playwright specs + fixtures  
- `Architecture/` — full architecture doc  
- `Test-Suite-Step/` — test runbook + `TEST_REPORT.md`  
- `scripts/setup.sh` — local bootstrap (Node 18+, installs, `.env` copies)

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Client + server (concurrently) |
| `npm test` | Vitest: client then server |
| `npm run test:e2e` | Playwright (`playwright.config.mjs`) |

First-time Playwright browsers: `npx playwright install chromium`

## GitHub Actions

CI runs on **push** and **pull_request** to **`main`**: `npm ci` → client Vitest → server Vitest → Playwright.  
Set optional secret **`GROK_API_KEY`**; E2E uses **`E2E_MOCK_GROK=1`** so CI stays deterministic without a live Grok dependency.

## TypeScript types

Keep in sync when the domain changes:

- `client/src/types/index.ts`  
- `server/src/types/index.ts`
