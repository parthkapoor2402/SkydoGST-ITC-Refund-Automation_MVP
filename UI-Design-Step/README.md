# UI design system & layout step

This folder documents the **Skydo GST Refund Automation** UI work: design tokens, shared components, app shell, routing, and pages. Implementation lives under `client/src/`; this file is the record of that step.

## What was delivered

### Design tokens & theming

- **`client/src/styles/base.css`** — CSS custom properties: Skydo palette (primary `#1A6B5C`, secondary `#F4F6F5`, accent `#00A896`, error / warning / success), surfaces, borders, text, focus ring, shadows, **4px spacing** (`--space-1` … `--space-24`), **typography with `clamp()`** (`--text-xs` … `--text-3xl`), radii, layout vars. **`[data-theme="dark"]`** for dark mode; `color-scheme` per theme.
- **`client/src/hooks/useTheme.ts`** — Persists theme in `localStorage` (`skydo-gst-theme`), sets `document.documentElement[data-theme]`.
- **`client/src/main.tsx`** — `syncThemeBeforePaint()` so first paint matches stored or system preference; guards when `matchMedia` is unavailable (e.g. tests).

### UI components

| File | Purpose |
|------|---------|
| `client/src/components/ui/Button.tsx` | Variants: primary, secondary, ghost, danger. Sizes: sm, md, lg. Loading + spinner, full TypeScript props. |
| `client/src/components/ui/Badge.tsx` | Variants: matched, unmatched, error, pending. `badgeVariantFromConfidence()` for match scores. |
| `client/src/components/ui/Card.tsx` | Elevations: flat, raised, overlay. Optional header, description, footer. |
| `client/src/components/ui/FileDropzone.tsx` | `react-dropzone`; PDF, CSV, JSON; drag-over state; file name + size. |
| `client/src/components/ui/ProgressStepper.tsx` | Upload → Match → Review → Download; active / completed / pending. |

### Layout & routing

- **`client/src/components/layout/AppShell.tsx`** — Sidebar (Skydo mark, nav), top bar (“GST Refund Automation”, tax period select, theme toggle), mobile drawer + skip link to `#main-content`.
- **`client/src/App.tsx`** — `BrowserRouter`, routes nested under `AppShell` + `<Outlet />`.
- **`client/src/lib/workflow.ts`** — `pathnameToProgressStepId()` for stepper vs path.

### Pages

| Route | File |
|-------|------|
| `/` | `client/src/pages/Dashboard.tsx` — Stats from Zustand, badges, stepper. |
| `/upload` | `client/src/pages/Upload.tsx` — FIRA + invoice dropzones, queue summary. |
| `/match` | `client/src/pages/MatchReview.tsx` — Match table + empty state. |
| `/report` | `client/src/pages/GenerateReport.tsx` — RFD-01 Statement 3B column list + preview when `rfdExport` exists. |
| `/download` | `client/src/pages/Download.tsx` — CA bundle description + download CTA (UI loading only until API wired). |

### Store

- **`client/src/store/useGSTStore.ts`** — Added `taxPeriod` (default `FY 2025–26`) and `setTaxPeriod` for the shell selector.

### Tooling & config

- **`client/package.json`** — `react-router-dom` dependency.
- **`client/src/index.css`** — Tailwind layers; body styling delegated to tokens in `base.css`.
- **`client/tailwind.config.js`** — `fontFamily` from `--font-sans` / `--font-mono`; colors reference CSS variables.
- **`client/src/App.test.tsx`**, **`client/e2e/app.spec.ts`** — Assertions updated for “GST Refund Automation” heading.

## Run locally

From repository root:

```bash
npm run dev
```

Client: `http://localhost:5173` (with server on `3001` if using full stack).

## Source tree (this step)

```
client/src/
├── styles/base.css
├── hooks/useTheme.ts
├── lib/workflow.ts
├── components/
│   ├── layout/AppShell.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Badge.tsx
│       ├── Card.tsx
│       ├── FileDropzone.tsx
│       └── ProgressStepper.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Upload.tsx
│   ├── MatchReview.tsx
│   ├── GenerateReport.tsx
│   └── Download.tsx
├── App.tsx
├── main.tsx
└── index.css
```

## Related

- Higher-level architecture: `Architecture/Architecture.md`.
