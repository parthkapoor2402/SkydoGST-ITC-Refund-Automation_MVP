import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { FileDropzone } from '../components/ui/FileDropzone'
import { ProgressStepper } from '../components/ui/ProgressStepper'
import {
  fetchFiraList,
  fetchInvoiceList,
  parseFiraCsv,
  parseInvoiceCsv,
  postSessionReset,
  queryKeys,
  uploadFiraJsonFiles,
  uploadInvoiceJsonFiles,
} from '../lib/gstApi'
import { mapParsedFiraToRecord, mapParsedInvoiceToRecord } from '../lib/gstMappers'
import { useGSTStore } from '../store/useGSTStore'
import type { TaxQuarter } from '../store/useGSTStore'

const FY_OPTIONS = ['2023–24', '2024–25', '2025–26', '2026–27'] as const
const Q_OPTIONS: TaxQuarter[] = ['Q1', 'Q2', 'Q3', 'Q4']

function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function PreviewSkeleton() {
  return (
    <div className="animate-pulse space-y-2 py-4" aria-hidden>
      <div className="h-3 w-full rounded bg-[var(--color-border)]" />
      <div className="h-3 w-5/6 rounded bg-[var(--color-border)]" />
      <div className="h-3 w-4/6 rounded bg-[var(--color-border)]" />
    </div>
  )
}

export default function Upload() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const financialYear = useGSTStore((s) => s.financialYear)
  const taxQuarter = useGSTStore((s) => s.taxQuarter)
  const setFinancialYear = useGSTStore((s) => s.setFinancialYear)
  const setTaxQuarter = useGSTStore((s) => s.setTaxQuarter)
  const syncTaxPeriodFromQuarter = useGSTStore((s) => s.syncTaxPeriodFromQuarter)
  const setFiras = useGSTStore((s) => s.setFiras)
  const setInvoices = useGSTStore((s) => s.setInvoices)
  const clearWorkflowData = useGSTStore((s) => s.clearWorkflowData)

  const firaQuery = useQuery({
    queryKey: queryKeys.firas,
    queryFn: fetchFiraList,
  })
  const invoiceQuery = useQuery({
    queryKey: queryKeys.invoices,
    queryFn: fetchInvoiceList,
  })

  const firaMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const json = files.filter((f) => /\.json$/i.test(f.name))
      const csv = files.filter((f) => /\.csv$/i.test(f.name))
      const other = files.filter(
        (f) => !/\.json$/i.test(f.name) && !/\.csv$/i.test(f.name),
      )
      if (other.length) {
        throw new Error(`Unsupported file type: ${other[0]!.name}`)
      }
      const messages: string[] = []
      if (json.length) {
        const r = await uploadFiraJsonFiles(json)
        r.errors.forEach((e) => messages.push(`${e.file}: ${e.error}`))
      }
      for (const cf of csv) {
        const text = await cf.text()
        try {
          await parseFiraCsv(text)
        } catch (e) {
          messages.push(
            `${cf.name}: ${e instanceof Error ? e.message : String(e)}`,
          )
        }
      }
      return messages
    },
    onSuccess: (warnings) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.firas })
      if (warnings.length) {
        toast.error('File could not be parsed — please check format')
      } else {
        toast.success('FIRA files imported')
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const invoiceMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const json = files.filter((f) => /\.json$/i.test(f.name))
      const csv = files.filter((f) => /\.csv$/i.test(f.name))
      const other = files.filter(
        (f) => !/\.json$/i.test(f.name) && !/\.csv$/i.test(f.name),
      )
      if (other.length) {
        throw new Error(`Unsupported file type: ${other[0]!.name}`)
      }
      const messages: string[] = []
      if (json.length) {
        const r = await uploadInvoiceJsonFiles(json)
        r.errors.forEach((e) => messages.push(`${e.file}: ${e.error}`))
      }
      for (const cf of csv) {
        const text = await cf.text()
        try {
          await parseInvoiceCsv(text)
        } catch (e) {
          messages.push(
            `${cf.name}: ${e instanceof Error ? e.message : String(e)}`,
          )
        }
      }
      return messages
    },
    onSuccess: (warnings) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices })
      if (warnings.length) {
        toast.error('File could not be parsed — please check format')
      } else {
        toast.success('Invoice files imported')
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const clearSessionMutation = useMutation({
    mutationFn: postSessionReset,
    onSuccess: () => {
      clearWorkflowData()
      void queryClient.invalidateQueries({ queryKey: queryKeys.firas })
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices })
      void queryClient.invalidateQueries({ queryKey: queryKeys.matchRows })
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportPreview })
      toast.success('Session cleared. You can upload again.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onFiraAccepted = useCallback(
    (files: File[]) => {
      firaMutation.mutate(files)
    },
    [firaMutation],
  )

  const onInvoiceAccepted = useCallback(
    (files: File[]) => {
      invoiceMutation.mutate(files)
    },
    [invoiceMutation],
  )

  const firaCount = firaQuery.data?.length ?? 0
  const invoiceCount = invoiceQuery.data?.length ?? 0

  const firaRecords = useMemo(() => {
    if (!firaQuery.data) return []
    return firaQuery.data.map((item) =>
      mapParsedFiraToRecord(item.id, item.sourceFileName, item.parsed),
    )
  }, [firaQuery.data])

  const invoiceRecords = useMemo(() => {
    if (!invoiceQuery.data) return []
    return invoiceQuery.data.map((item) =>
      mapParsedInvoiceToRecord(item.id, item.sourceFileName, item.parsed),
    )
  }, [invoiceQuery.data])

  useEffect(() => {
    setFiras(firaRecords)
    setInvoices(invoiceRecords)
  }, [firaRecords, invoiceRecords, setFiras, setInvoices])

  const busy =
    firaMutation.isPending ||
    invoiceMutation.isPending ||
    clearSessionMutation.isPending
  const canStart = firaCount > 0 && invoiceCount > 0 && !busy

  const onClearSession = useCallback(() => {
    if (
      !window.confirm(
        'Clear all FIRAs, invoices, match results, and generated report data for this session? This cannot be undone.',
      )
    ) {
      return
    }
    clearSessionMutation.mutate()
  }, [clearSessionMutation])

  return (
    <div className="mx-auto max-w-6xl space-y-[var(--space-8)]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[length:var(--text-2xl)] font-semibold tracking-tight text-[var(--color-text-primary)]">
            Step 1: Upload documents
          </h2>
          <p className="mt-1 max-w-3xl text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            Pull exports from Skydo, upload them here, then go to matching. Most
            freelancers finish this step in about two minutes.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 self-start"
          disabled={busy}
          loading={clearSessionMutation.isPending}
          onClick={onClearSession}
        >
          Clear session / Start over
        </Button>
      </header>

      <Card elevation="raised" header="Progress" padding="md">
        <ProgressStepper currentStepId="upload" />
      </Card>

      <div className="grid grid-cols-1 gap-[var(--space-6)] lg:grid-cols-2">
        <Card elevation="flat" header="FIRAs" padding="md">
          <FileDropzone
            variant="structured"
            label="Upload FIRAs from Skydo"
            description="Download your FIRA documents from Skydo Dashboard → Payments → Export FIRAs. Upload JSON files or a CSV bulk export."
            onFilesAccepted={onFiraAccepted}
            disabled={busy}
            maxFiles={24}
          />
          <p className="mt-4 text-[length:var(--text-sm)] font-medium text-[var(--color-text-primary)]">
            {firaCount === 1 ? '1 FIRA uploaded' : `${firaCount} FIRAs uploaded`}
          </p>
          <div className="mt-3 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
            {firaQuery.isLoading ? (
              <PreviewSkeleton />
            ) : firaCount === 0 ? (
              <p className="p-4 text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                No FIRAs yet — drop files above.
              </p>
            ) : (
              <table className="w-full min-w-[520px] border-collapse text-left text-[length:var(--text-xs)]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
                    <th className="px-3 py-2 font-semibold">Reference</th>
                    <th className="px-3 py-2 font-semibold">Amount</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Client</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {firaQuery.data!.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--color-border)] last:border-0"
                    >
                      <td className="px-3 py-2 font-mono text-[var(--color-text-primary)]">
                        {row.parsed.referenceNumber}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatInr(row.parsed.creditedAmountInr.value)}
                      </td>
                      <td className="px-3 py-2">{row.parsed.valueDateIso}</td>
                      <td className="max-w-[140px] truncate px-3 py-2">
                        {row.parsed.remitterName}
                      </td>
                      <td className="px-3 py-2 text-[var(--color-success)]">
                        Ready
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card elevation="flat" header="Invoices" padding="md">
          <FileDropzone
            variant="structured"
            label="Upload invoices from Skydo"
            description="Download invoices from Skydo Dashboard → Invoices → Export All. JSON or CSV bulk export."
            onFilesAccepted={onInvoiceAccepted}
            disabled={busy}
            maxFiles={24}
          />
          <p className="mt-4 text-[length:var(--text-sm)] font-medium text-[var(--color-text-primary)]">
            {invoiceCount === 1
              ? '1 invoice uploaded'
              : `${invoiceCount} invoices uploaded`}
          </p>
          <div className="mt-3 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
            {invoiceQuery.isLoading ? (
              <PreviewSkeleton />
            ) : invoiceCount === 0 ? (
              <p className="p-4 text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                No invoices yet — drop files above.
              </p>
            ) : (
              <table className="w-full min-w-[520px] border-collapse text-left text-[length:var(--text-xs)]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
                    <th className="px-3 py-2 font-semibold">Invoice No.</th>
                    <th className="px-3 py-2 font-semibold">Amount</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Client</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceQuery.data!.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--color-border)] last:border-0"
                    >
                      <td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">
                        {row.parsed.invoiceNumber}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatInr(
                          row.parsed.taxableValueInr + row.parsed.igstAmount,
                        )}
                      </td>
                      <td className="px-3 py-2">{row.parsed.invoiceDate}</td>
                      <td className="max-w-[140px] truncate px-3 py-2">
                        {row.parsed.client.name}
                      </td>
                      <td className="px-3 py-2 text-[var(--color-success)]">
                        Ready
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      <Card elevation="overlay" header="Tax period" padding="md">
        <p className="mb-4 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          Pick the quarter and financial year for this refund. This appears on
          your report and download bundle.
        </p>
        <div className="flex flex-wrap gap-4">
          <div>
            <label
              htmlFor="fy-select"
              className="mb-1 block text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
            >
              Financial year
            </label>
            <select
              id="fy-select"
              value={financialYear}
              onChange={(e) => {
                setFinancialYear(e.target.value)
                syncTaxPeriodFromQuarter()
              }}
              className="min-w-[10rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-[length:var(--text-sm)]"
            >
              {FY_OPTIONS.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="q-select"
              className="mb-1 block text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
            >
              Quarter
            </label>
            <select
              id="q-select"
              value={taxQuarter}
              onChange={(e) => {
                setTaxQuarter(e.target.value as TaxQuarter)
                syncTaxPeriodFromQuarter()
              }}
              className="min-w-[8rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-[length:var(--text-sm)]"
            >
              {Q_OPTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="primary"
          size="lg"
          disabled={!canStart}
          loading={busy}
          onClick={() => navigate('/match?run=1')}
          aria-label="Start matching FIRAs to invoices"
        >
          Start matching →
        </Button>
      </div>
    </div>
  )
}
