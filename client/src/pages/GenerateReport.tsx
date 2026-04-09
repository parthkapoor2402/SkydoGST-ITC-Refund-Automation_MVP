import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ProgressStepper } from '../components/ui/ProgressStepper'
import { apiUrl } from '../lib/apiBase'
import { postReportGenerate, queryKeys } from '../lib/gstApi'
import type { ApprovedMatchPayload, Rfd01Statement3BRow } from '../types'
import { useGSTStore } from '../store/useGSTStore'

type ReportApiBody = {
  version?: string
  generatedAt?: string
  statement: {
    rows: Rfd01Statement3BRow[]
    summary: {
      totalInvoiceValue: number
      totalTaxableValue: number
      totalIntegratedTax: number
      rowCount: number
      lutNumbersUsed?: string[]
    }
    validationWarnings: Array<{ rowIndex: number; code: string; message: string }>
  }
}

const COL_DEFS: Array<{
  key: keyof Rfd01Statement3BRow
  label: string
  numeric?: boolean
}> = [
  { key: 'gstinOfSupplier', label: 'GSTIN of Supplier' },
  { key: 'invoiceNo', label: 'Invoice No.' },
  { key: 'invoiceDate', label: 'Invoice Date' },
  { key: 'invoiceValue', label: 'Invoice Value (INR)', numeric: true },
  { key: 'taxableValue', label: 'Taxable Value (INR)', numeric: true },
  { key: 'integratedTax', label: 'Integrated Tax', numeric: true },
  { key: 'centralTax', label: 'Central Tax', numeric: true },
  { key: 'stateUtTax', label: 'State/UT Tax', numeric: true },
  { key: 'cess', label: 'Cess', numeric: true },
  { key: 'brcFircNo', label: 'BRC/FIRC No.' },
  { key: 'brcFircDate', label: 'BRC/FIRC Date' },
  { key: 'portCode', label: 'Port Code' },
  { key: 'shippingBillNo', label: 'Shipping Bill No.' },
  { key: 'shippingBillDate', label: 'Shipping Bill Date' },
]

function normalizeRow(r: Rfd01Statement3BRow): Rfd01Statement3BRow {
  return {
    gstinOfSupplier: r.gstinOfSupplier ?? '',
    invoiceNo: r.invoiceNo ?? '',
    invoiceDate: r.invoiceDate ?? '',
    invoiceValue: Number(r.invoiceValue) || 0,
    taxableValue: Number(r.taxableValue) || 0,
    integratedTax: Number(r.integratedTax) || 0,
    centralTax: Number(r.centralTax) || 0,
    stateUtTax: Number(r.stateUtTax) || 0,
    cess: Number(r.cess) || 0,
    brcFircNo: r.brcFircNo ?? '',
    brcFircDate: r.brcFircDate ?? '',
    portCode: r.portCode ?? '',
    shippingBillNo: r.shippingBillNo ?? '',
    shippingBillDate: r.shippingBillDate ?? '',
    missingBrcFlag: r.missingBrcFlag,
  }
}

function cloneRows(rows: Rfd01Statement3BRow[]): Rfd01Statement3BRow[] {
  return rows.map((r) => normalizeRow({ ...r }))
}

function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

async function fetchReportPreview(): Promise<ReportApiBody | null> {
  const res = await fetch(apiUrl('/api/report/preview'))
  if (res.status === 404) return null
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || res.statusText)
  }
  return (await res.json()) as ReportApiBody
}

export default function GenerateReport() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const taxPeriod = useGSTStore((s) => s.taxPeriod)
  const setRfdExport = useGSTStore((s) => s.setRfdExport)
  const setStatement3BRows = useGSTStore((s) => s.setStatement3BRows)
  const firas = useGSTStore((s) => s.firas)
  const invoices = useGSTStore((s) => s.invoices)

  const [sortKey, setSortKey] = useState<keyof Rfd01Statement3BRow | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [editedRows, setEditedRows] = useState<Rfd01Statement3BRow[]>([])

  const previewQuery = useQuery({
    queryKey: queryKeys.reportPreview,
    queryFn: fetchReportPreview,
  })

  useEffect(() => {
    const rows = previewQuery.data?.statement?.rows
    if (rows?.length) {
      const next = cloneRows(rows)
      setEditedRows(next)
      setStatement3BRows(next)
      setRfdExport({
        rows: next,
        validationWarnings:
          previewQuery.data?.statement?.validationWarnings ?? [],
      })
    }
  }, [previewQuery.data, setRfdExport, setStatement3BRows])

  const regenMut = useMutation({
    mutationFn: async (payload: ApprovedMatchPayload[]) => {
      await postReportGenerate(payload)
      const next = await fetchReportPreview()
      return next
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.reportPreview })
      if (data?.statement?.rows) {
        const next = cloneRows(data.statement.rows)
        setEditedRows(next)
        toast.success('Report refreshed')
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const summary = previewQuery.data?.statement?.summary
  const gstin = editedRows[0]?.gstinOfSupplier ?? '—'

  const sortedRowIndices = useMemo(() => {
    const idx = editedRows.map((_, i) => i)
    if (!sortKey) return idx
    idx.sort((ia, ib) => {
      const av = editedRows[ia]![sortKey]
      const bv = editedRows[ib]![sortKey]
      const an = typeof av === 'number' ? av : String(av ?? '')
      const bn = typeof bv === 'number' ? bv : String(bv ?? '')
      let cmp = 0
      if (typeof an === 'number' && typeof bn === 'number') {
        cmp = an - bn
      } else {
        cmp = String(an).localeCompare(String(bn), 'en', { numeric: true })
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return idx
  }, [editedRows, sortKey, sortDir])

  const onHeaderClick = (key: keyof Rfd01Statement3BRow) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const updateCell = useCallback(
    (rowIndex: number, key: keyof Rfd01Statement3BRow, value: string) => {
      setEditedRows((prev) => {
        const next = [...prev]
        const row = { ...next[rowIndex]! }
        const def = COL_DEFS.find((c) => c.key === key)
        if (def?.numeric) {
          ;(row as Record<string, unknown>)[key] = parseFloat(value) || 0
        } else {
          ;(row as Record<string, unknown>)[key] = value
        }
        next[rowIndex] = normalizeRow(row)
        setStatement3BRows(next)
        setRfdExport({
          rows: next,
          validationWarnings:
            previewQuery.data?.statement?.validationWarnings ?? [],
        })
        return next
      })
    },
    [previewQuery.data?.statement?.validationWarnings, setRfdExport, setStatement3BRows],
  )

  const brcWarnings = useMemo(() => {
    return editedRows.filter(
      (r) =>
        r.missingBrcFlag ||
        !String(r.brcFircNo ?? '').trim() ||
        !String(r.brcFircDate ?? '').trim(),
    )
  }, [editedRows])

  const buildPayloadFromStore = (): ApprovedMatchPayload[] => {
    const out: ApprovedMatchPayload[] = []
    const n = Math.min(firas.length, invoices.length)
    for (let i = 0; i < n; i++) {
      out.push({
        fira: firas[i]!,
        invoice: invoices[i]!,
        approvedBy: 'Exporter',
        approvedAt: new Date().toISOString(),
      })
    }
    return out
  }

  const loading = previewQuery.isLoading
  const empty = !loading && previewQuery.data === null

  return (
    <div className="mx-auto max-w-[100rem] space-y-[var(--space-8)]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[length:var(--text-2xl)] font-semibold tracking-tight text-[var(--color-text-primary)]">
            Step 3: Generate report
          </h2>
          <p className="mt-1 max-w-2xl text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            Review Statement 3B rows, fix any cell inline, then open the CA
            bundle download.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/match')}
        >
          Back to matches
        </Button>
      </header>

      <Card elevation="raised" header="Progress" padding="md">
        <ProgressStepper currentStepId="review" />
      </Card>

      {loading ? (
        <div className="animate-pulse space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6">
          <div className="h-8 w-1/3 rounded bg-[var(--color-border)]" />
          <div className="h-32 w-full rounded bg-[var(--color-border)]" />
        </div>
      ) : null}

      {empty ? (
        <Card elevation="overlay" header="No report yet" padding="md">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            Finish match review and click <strong>Generate CA report</strong>{' '}
            there first. Or retry below if you already approved pairs.
          </p>
          <Button
            type="button"
            className="mt-4"
            variant="primary"
            loading={regenMut.isPending}
            onClick={() => {
              const p = buildPayloadFromStore()
              if (!p.length) {
                toast.error('No FIRA/invoice pairs in session. Upload and match first.')
                return
              }
              regenMut.mutate(p)
            }}
          >
            Build report from session
          </Button>
        </Card>
      ) : null}

      {!loading && previewQuery.data?.statement ? (
        <>
          <Card elevation="flat" header="Summary" padding="md">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[length:var(--text-2xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Total transactions
                </p>
                <p className="text-[length:var(--text-xl)] font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {summary?.rowCount ?? editedRows.length}
                </p>
              </div>
              <div>
                <p className="text-[length:var(--text-2xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Total taxable value
                </p>
                <p className="text-[length:var(--text-xl)] font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {formatInr(summary?.totalTaxableValue ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[length:var(--text-2xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Period
                </p>
                <p className="text-[length:var(--text-lg)] font-medium text-[var(--color-text-primary)]">
                  {taxPeriod}
                </p>
              </div>
              <div>
                <p className="text-[length:var(--text-2xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  GSTIN
                </p>
                <p className="font-mono text-[length:var(--text-sm)] text-[var(--color-text-primary)]">
                  {gstin}
                </p>
              </div>
            </div>
            {brcWarnings.length > 0 ? (
              <div
                className="mt-4 rounded-[var(--radius-md)] border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[length:var(--text-sm)] text-[var(--color-text-primary)]"
                role="alert"
              >
                <strong>Warning:</strong> {brcWarnings.length} row(s) have a
                missing or incomplete BRC/FIRC reference or date. Fix before
                filing.
              </div>
            ) : null}
          </Card>

          <Card
            elevation="overlay"
            header="Statement 3B (all columns)"
            headerDescription="Tap a column title to sort. Edit cells directly — changes stay in this session until you regenerate from the server."
            padding="none"
            footer={
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    toast.success('Opening download step')
                    navigate('/download')
                  }}
                >
                  Generate CA bundle →
                </Button>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] border-collapse text-left text-[length:var(--text-xs)]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                    {COL_DEFS.map((c) => (
                      <th key={c.key} className="whitespace-nowrap px-2 py-2">
                        <button
                          type="button"
                          className="font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                          onClick={() => onHeaderClick(c.key)}
                        >
                          {c.label}
                          {sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRowIndices.map((rowIndex) => {
                    const row = editedRows[rowIndex]!
                    return (
                      <tr
                        key={`row-${rowIndex}`}
                        className="border-b border-[var(--color-border)]"
                      >
                        {COL_DEFS.map((c) => (
                          <td key={c.key} className="px-1 py-1">
                            {c.numeric ? (
                              <input
                                className="w-full min-w-[4.5rem] rounded border border-transparent bg-transparent px-1 py-1 font-mono tabular-nums hover:border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none"
                                value={String(row[c.key] ?? '')}
                                onChange={(e) =>
                                  updateCell(rowIndex, c.key, e.target.value)
                                }
                                aria-label={`${c.label} for ${row.invoiceNo}`}
                              />
                            ) : (
                              <input
                                className="w-full min-w-[5rem] rounded border border-transparent bg-transparent px-1 py-1 hover:border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none"
                                value={String(row[c.key] ?? '')}
                                onChange={(e) =>
                                  updateCell(rowIndex, c.key, e.target.value)
                                }
                                aria-label={`${c.label} for ${row.invoiceNo}`}
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}

      {previewQuery.isError ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-error)]">
          {(previewQuery.error as Error).message}
        </p>
      ) : null}
    </div>
  )
}
