import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ProgressStepper } from '../components/ui/ProgressStepper'

const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

type PreviewStatement = {
  summary: {
    totalTaxableValue: number
    rowCount: number
    totalInvoiceValue: number
    totalIntegratedTax: number
    lutNumbersUsed?: string[]
  }
  rows: { gstinOfSupplier: string }[]
}

type ReportPreview = {
  statement: PreviewStatement
}

function parseFilename(cd: string | null): string | undefined {
  if (!cd) return undefined
  const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd)
  return m?.[1]?.trim()
}

const BUNDLE_TREE = [
  'GST_Refund_Bundle_[GSTIN]_[Period]_[Date].zip',
  '├── 01_Statement_3B/',
  '│   ├── RFD01_Statement3B_[GSTIN]_[Period].csv',
  '│   └── RFD01_Statement3B_[GSTIN]_[Period].json',
  '├── 02_FIRA_Documents/',
  '│   ├── FIRA_[UTRRef]_[Amount]_[Date].pdf',
  '│   └── FIRA_Index.csv',
  '├── 03_Invoice_Copies/',
  '│   ├── INV_[InvoiceNo]_[Client]_[Amount].pdf',
  '│   └── Invoice_Index.csv',
  '├── 04_Match_Report/',
  '│   └── Match_Audit_Trail.csv',
  '├── 05_Summary/',
  '│   ├── Refund_Summary.pdf',
  '│   └── README_FOR_CA.txt',
  '└── CHECKSUM.txt',
]

export default function Download() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ReportPreview | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${apiBase}/api/report/preview`)
        if (!res.ok) {
          if (!cancelled) {
            setPreview(null)
            setPreviewError(
              res.status === 404
                ? 'Generate the report first (previous step), then return here to download.'
                : `Preview unavailable (${res.status})`,
            )
          }
          return
        }
        const data = (await res.json()) as ReportPreview
        if (!cancelled) {
          setPreview(data)
          setPreviewError(null)
        }
      } catch {
        if (!cancelled) {
          setPreviewError(
            'Could not reach the server. Start the API (e.g. npm run dev -w server) and try again.',
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const estimatedRefund =
    preview?.statement?.summary?.totalTaxableValue != null
      ? Math.round(preview.statement.summary.totalTaxableValue * 0.18 * 100) /
        100
      : null

  const exporterGstin =
    preview?.statement?.rows?.[0]?.gstinOfSupplier ?? '—'

  const downloadBundle = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/download/bundle`)
      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText)
        throw new Error(errText || `Download failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        parseFilename(res.headers.get('Content-Disposition')) ??
        'GST_Refund_Bundle.zip'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      window.alert(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-[var(--space-8)]">
      <header>
        <h2 className="text-[length:var(--text-2xl)] font-semibold tracking-tight text-[var(--color-text-primary)]">
          Download bundle for your CA
        </h2>
        <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          One ZIP with Statement 3B (GST import), FIRA and invoice slots,
          match audit trail, checksums, and a short guide for filing RFD-01
          online.
        </p>
      </header>

      <Card elevation="raised" header="Progress" padding="md">
        <ProgressStepper currentStepId="download" />
      </Card>

      {estimatedRefund != null && (
        <Card
          elevation="overlay"
          header="Estimated eligible refund (proxy)"
          headerDescription="18% of total taxable value in this bundle — placeholder until input ITC registers are linked. Your CA must validate."
          padding="md"
        >
          <p className="text-[length:var(--text-3xl)] font-semibold tabular-nums text-[var(--color-text-primary)]">
            ₹{estimatedRefund.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            Exporter GSTIN (from statement):{' '}
            <span className="font-medium text-[var(--color-text-primary)]">
              {exporterGstin}
            </span>
            {' · '}
            Transactions:{' '}
            {preview?.statement?.summary?.rowCount ?? '—'}
          </p>
        </Card>
      )}

      {previewError && !preview && (
        <p
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[length:var(--text-sm)] text-[var(--color-text-primary)]"
          role="status"
        >
          {previewError}
        </p>
      )}

      <Card
        elevation="overlay"
        header="Bundle contents (structure)"
        headerDescription="Exact layout inside the ZIP — suitable for GST portal import and CA review."
        padding="md"
        footer={
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-4 py-3 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              <p className="font-medium text-[var(--color-text-primary)]">
                Checklist
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>
                  Share this ZIP with your CA through a secure channel (not
                  ordinary email if it contains sensitive remittance data).
                </li>
                <li>
                  Share GST portal access with your CA only if you choose to —
                  use strong passwords and revoke access after filing.
                </li>
                <li>
                  Confirm Statement 3B CSV opens in the GST offline utility
                  before filing.
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/report')}
                aria-label="Back to report step"
              >
                Back to report
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={loading}
                onClick={() => void downloadBundle()}
                aria-label="Download ZIP bundle for chartered accountant"
              >
                Download bundle for CA
              </Button>
            </div>
          </div>
        }
      >
        <pre className="overflow-x-auto rounded-md bg-[var(--color-surface-inverse)]/5 p-4 font-mono text-[length:var(--text-xs)] leading-relaxed text-[var(--color-text-primary)]">
          {BUNDLE_TREE.join('\n')}
        </pre>
        {loading && (
          <p
            className="mt-4 flex items-center gap-2 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]"
            aria-live="polite"
          >
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent"
              aria-hidden
            />
            Building ZIP on the server…
          </p>
        )}
      </Card>
    </div>
  )
}
