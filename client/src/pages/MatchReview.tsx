import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Badge, badgeVariantFromConfidence } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ProgressStepper } from '../components/ui/ProgressStepper'
import {
  approveMatchRow,
  fetchFiraList,
  fetchInvoiceList,
  fetchMatchRows,
  overrideMatchRow,
  postMatchRun,
  postReportGenerate,
  queryKeys,
  rejectMatchRow,
} from '../lib/gstApi'
import {
  asMatchResultRow,
  buildApprovedMatchesPayload,
  categorizeMatchRow,
  confidenceLabelToScore,
  describeMatchReason,
} from '../lib/matchUi'
import type { MatchResultRowUI } from '../types'
import type { StoredFiraItem, StoredInvoiceItem } from '../types/parser'
import { useGSTStore } from '../store/useGSTStore'

function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function PairSummary({
  firaRef,
  amountInr,
  date,
  remitter,
  invoiceNo,
  invAmount,
  invDate,
  client,
}: {
  firaRef: string
  amountInr: number
  date: string
  remitter: string
  invoiceNo: string | null
  invAmount: number | null
  invDate: string | null
  client: string | null
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3">
        <p className="text-[length:var(--text-2xs)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          FIRA
        </p>
        <p className="mt-1 font-mono text-[length:var(--text-sm)] text-[var(--color-text-primary)]">
          {firaRef}
        </p>
        <p className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
          {formatInr(amountInr)} · {date}
        </p>
        <p className="mt-1 text-[length:var(--text-xs)]">{remitter}</p>
      </div>
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3">
        <p className="text-[length:var(--text-2xs)] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Invoice
        </p>
        {invoiceNo ? (
          <>
            <p className="mt-1 text-[length:var(--text-sm)] font-medium text-[var(--color-text-primary)]">
              {invoiceNo}
            </p>
            <p className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
              {invAmount != null ? formatInr(invAmount) : '—'} ·{' '}
              {invDate ?? '—'}
            </p>
            <p className="mt-1 text-[length:var(--text-xs)]">{client}</p>
          </>
        ) : (
          <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            No invoice linked
          </p>
        )}
      </div>
    </div>
  )
}

export default function MatchReview() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const skippedIds = useGSTStore((s) => s.skippedMatchRowIds)
  const addSkipped = useGSTStore((s) => s.addSkippedMatchRow)

  const [progress, setProgress] = useState(0)
  const [manualSearch, setManualSearch] = useState<Record<string, string>>({})
  const [rejectOpen, setRejectOpen] = useState<Record<string, boolean>>({})

  const firaQuery = useQuery({
    queryKey: queryKeys.firas,
    queryFn: fetchFiraList,
  })
  const invoiceQuery = useQuery({
    queryKey: queryKeys.invoices,
    queryFn: fetchInvoiceList,
  })
  const matchQuery = useQuery({
    queryKey: queryKeys.matchRows,
    queryFn: fetchMatchRows,
  })

  const rows: MatchResultRowUI[] = useMemo(
    () => (matchQuery.data ?? []).map((r) => asMatchResultRow(r)),
    [matchQuery.data],
  )

  const firaByRef = useMemo(() => {
    const m = new Map<string, StoredFiraItem>()
    for (const item of firaQuery.data ?? []) {
      m.set(item.parsed.referenceNumber, item)
    }
    return m
  }, [firaQuery.data])

  const invoiceByNo = useMemo(() => {
    const m = new Map<string, StoredInvoiceItem>()
    for (const item of invoiceQuery.data ?? []) {
      m.set(item.parsed.invoiceNumber, item)
    }
    return m
  }, [invoiceQuery.data])

  const totalFiras = firaQuery.data?.length ?? 0

  const runMatchMutation = useMutation({
    mutationFn: () => postMatchRun(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.matchRows })
      toast.success('Matching complete')
      setProgress(100)
    },
    onError: (e: Error) => {
      toast.error(e.message)
      setProgress(0)
    },
  })

  useEffect(() => {
    if (!runMatchMutation.isPending) return
    setProgress(12)
    const t = window.setInterval(() => {
      setProgress((p) => (p >= 88 ? p : p + 7))
    }, 350)
    return () => window.clearInterval(t)
  }, [runMatchMutation.isPending])

  useEffect(() => {
    const run = searchParams.get('run')
    if (run !== '1') return
    if (totalFiras === 0) return
    setSearchParams({}, { replace: true })
    runMatchMutation.mutate()
  }, [searchParams, setSearchParams, totalFiras, runMatchMutation])

  const invalidateMatches = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.matchRows })
  }, [queryClient])

  const approveMut = useMutation({
    mutationFn: (id: string) => approveMatchRow(id),
    onSuccess: () => {
      invalidateMatches()
      toast.success('Approved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectMatchRow(id),
    onSuccess: () => {
      invalidateMatches()
      toast.success('Marked for re-link')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const overrideMut = useMutation({
    mutationFn: ({ id, no }: { id: string; no: string }) =>
      overrideMatchRow(id, no),
    onSuccess: () => {
      invalidateMatches()
      toast.success('Invoice linked')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const reportMut = useMutation({
    mutationFn: (payload: ReturnType<typeof buildApprovedMatchesPayload>) =>
      postReportGenerate(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportPreview })
      toast.success('Report generated')
      navigate('/report')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const autoRows = rows.filter(
    (r) => categorizeMatchRow(r, skippedIds) === 'auto',
  )
  const reviewRows = rows.filter(
    (r) => categorizeMatchRow(r, skippedIds) === 'review',
  )
  const unmatchedRows = rows.filter(
    (r) => categorizeMatchRow(r, skippedIds) === 'unmatched',
  )

  const aiReviewCount = rows.filter(
    (r) =>
      r.match.status === 'ai_suggested' ||
      Boolean(r.match.grok?.reasoning) ||
      r.match.status === 'pending_user_confirmation',
  ).length

  const matchedSoFar = rows.filter(
    (r) => r.match.status !== 'unmatched',
  ).length

  const approveAllAuto = async () => {
    const pending = autoRows.filter((r) => r.decision === 'pending')
    for (const r of pending) {
      try {
        await approveMatchRow(r.id)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e))
        break
      }
    }
    invalidateMatches()
    toast.success('Auto-matched pairs approved')
  }

  const continueToReport = () => {
    const payload = buildApprovedMatchesPayload(
      rows,
      firaQuery.data ?? [],
      invoiceQuery.data ?? [],
      skippedIds,
    )
    if (payload.length === 0) {
      toast.error('Approve at least one pair before generating a report.')
      return
    }
    reportMut.mutate(payload)
  }

  const filterInvoices = (q: string) => {
    const s = q.trim().toLowerCase()
    if (!s) return invoiceQuery.data ?? []
    return (invoiceQuery.data ?? []).filter(
      (i) =>
        i.parsed.invoiceNumber.toLowerCase().includes(s) ||
        i.parsed.client.name.toLowerCase().includes(s),
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-[var(--space-8)]">
      <header className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[length:var(--text-2xl)] font-semibold tracking-tight text-[var(--color-text-primary)]">
            Step 2: Review matches
          </h2>
          <p className="mt-1 max-w-2xl text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            Green rows are ready to approve in bulk. Orange rows need a quick
            check. Red rows need a manual invoice or can be skipped.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/upload')}
        >
          Back to upload
        </Button>
      </header>

      <Card elevation="raised" header="Progress" padding="md">
        <ProgressStepper currentStepId="match" />
      </Card>

      {(runMatchMutation.isPending || matchQuery.isLoading) && totalFiras > 0 ? (
        <Card elevation="flat" header="Matching in progress" padding="md">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            Matching {Math.min(matchedSoFar, totalFiras)} of {totalFiras} FIRAs…
          </p>
          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-[var(--color-primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {aiReviewCount > 0 && !runMatchMutation.isPending ? (
            <p className="mt-3 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              AI is reviewing {aiReviewCount} unclear matches…
            </p>
          ) : runMatchMutation.isPending ? (
            <p className="mt-3 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              Grok AI may be reviewing unclear matches — this can take a moment.
            </p>
          ) : null}
        </Card>
      ) : rows.length > 0 && aiReviewCount > 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          AI is reviewing {aiReviewCount} unclear matches…
        </p>
      ) : null}

      {matchQuery.isLoading && !runMatchMutation.isPending ? (
        <div className="animate-pulse space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6">
          <div className="h-4 w-2/3 rounded bg-[var(--color-border)]" />
          <div className="h-4 w-full rounded bg-[var(--color-border)]" />
          <div className="h-4 w-5/6 rounded bg-[var(--color-border)]" />
        </div>
      ) : null}

      {rows.length === 0 && !matchQuery.isLoading && !runMatchMutation.isPending ? (
        <Card elevation="flat" padding="md">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            No match run yet. Go back to upload and choose{' '}
            <strong>Start matching</strong>, or click below.
          </p>
          <Button
            type="button"
            className="mt-4"
            variant="primary"
            onClick={() => runMatchMutation.mutate()}
            disabled={totalFiras === 0 || (invoiceQuery.data?.length ?? 0) === 0}
          >
            Run matching now
          </Button>
        </Card>
      ) : null}

      {autoRows.length > 0 ? (
        <details className="group rounded-[var(--radius-lg)] border border-[var(--color-success)]/40 bg-[var(--color-success-muted)]/30">
          <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-[var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <span className="rounded-full bg-[var(--color-success)] px-2 py-0.5 text-[length:var(--text-2xs)] text-white">
                AUTO-MATCHED
              </span>
              {autoRows.length} pair{autoRows.length === 1 ? '' : 's'} matched
              automatically
            </span>
          </summary>
          <div className="space-y-4 border-t border-[var(--color-border)] px-4 py-4">
            <Button type="button" size="sm" variant="secondary" onClick={() => void approveAllAuto()}>
              Approve all
            </Button>
            {autoRows.map((row) => {
              const f = firaByRef.get(row.match.firaReferenceNumber)
              const invNo =
                row.overrideInvoiceNumber ?? row.match.matchedInvoiceNumber
              const inv = invNo ? invoiceByNo.get(invNo) : undefined
              const score = confidenceLabelToScore(row.match.confidence)
              return (
                <div
                  key={row.id}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <Badge variant={badgeVariantFromConfidence(score)}>
                      {Math.round(score * 100)}%
                    </Badge>
                    {row.decision === 'pending' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        loading={approveMut.isPending}
                        onClick={() => approveMut.mutate(row.id)}
                      >
                        Approve
                      </Button>
                    ) : (
                      <span className="text-[length:var(--text-xs)] text-[var(--color-success)]">
                        {row.decision}
                      </span>
                    )}
                  </div>
                  {f ? (
                    <PairSummary
                      firaRef={f.parsed.referenceNumber}
                      amountInr={f.parsed.creditedAmountInr.value}
                      date={f.parsed.valueDateIso}
                      remitter={f.parsed.remitterName}
                      invoiceNo={invNo}
                      invAmount={
                        inv
                          ? inv.parsed.taxableValueInr + inv.parsed.igstAmount
                          : null
                      }
                      invDate={inv?.parsed.invoiceDate ?? null}
                      client={inv?.parsed.client.name ?? null}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </details>
      ) : null}

      {reviewRows.length > 0 ? (
        <details open className="rounded-[var(--radius-lg)] border border-amber-500/50 bg-amber-500/10">
          <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-[var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[length:var(--text-2xs)] text-white">
                NEEDS REVIEW
              </span>
              {reviewRows.length} pair{reviewRows.length === 1 ? '' : 's'} need
              your confirmation
            </span>
          </summary>
          <div className="space-y-4 border-t border-[var(--color-border)] px-4 py-4">
            {reviewRows.map((row) => {
              const f = firaByRef.get(row.match.firaReferenceNumber)
              const invNo =
                row.overrideInvoiceNumber ?? row.match.matchedInvoiceNumber
              const inv = invNo ? invoiceByNo.get(invNo) : undefined
              const score = confidenceLabelToScore(row.match.confidence)
              const search =
                manualSearch[row.id] ??
                (rejectOpen[row.id] ? '' : inv?.parsed.invoiceNumber ?? '')
              return (
                <div
                  key={row.id}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4"
                >
                  <p className="mb-3 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                    {describeMatchReason(row.match)}
                  </p>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant={badgeVariantFromConfidence(score)}>
                      {Math.round(score * 100)}%
                    </Badge>
                    {(row.match.status === 'ai_suggested' ||
                      row.match.tier === 4) && (
                      <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[length:var(--text-2xs)] font-semibold uppercase tracking-wide text-white">
                        AI-assisted
                      </span>
                    )}
                  </div>
                  {f ? (
                    <PairSummary
                      firaRef={f.parsed.referenceNumber}
                      amountInr={f.parsed.creditedAmountInr.value}
                      date={f.parsed.valueDateIso}
                      remitter={f.parsed.remitterName}
                      invoiceNo={invNo}
                      invAmount={
                        inv
                          ? inv.parsed.taxableValueInr + inv.parsed.igstAmount
                          : null
                      }
                      invDate={inv?.parsed.invoiceDate ?? null}
                      client={inv?.parsed.client.name ?? null}
                    />
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => approveMut.mutate(row.id)}
                      loading={approveMut.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void rejectMut.mutateAsync(row.id)
                        setRejectOpen((o) => ({ ...o, [row.id]: true }))
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                  {(rejectOpen[row.id] || row.decision === 'rejected') && (
                    <div className="mt-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-3">
                      <label className="mb-1 block text-[length:var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                        Link to different invoice
                      </label>
                      <input
                        type="search"
                        placeholder="Search invoice no. or client…"
                        value={search}
                        onChange={(e) =>
                          setManualSearch((m) => ({
                            ...m,
                            [row.id]: e.target.value,
                          }))
                        }
                        className="mb-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-[length:var(--text-sm)]"
                      />
                      <select
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-[length:var(--text-sm)]"
                        aria-label="Choose invoice to link"
                        defaultValue=""
                        onChange={(e) => {
                          const v = e.target.value
                          if (!v) return
                          overrideMut.mutate({ id: row.id, no: v })
                          setRejectOpen((o) => ({ ...o, [row.id]: false }))
                          e.target.value = ''
                        }}
                      >
                        <option value="">Select invoice…</option>
                        {filterInvoices(search).map((i) => (
                          <option
                            key={i.id}
                            value={i.parsed.invoiceNumber}
                          >
                            {i.parsed.invoiceNumber} — {i.parsed.client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </details>
      ) : null}

      {unmatchedRows.length > 0 ? (
        <details className="rounded-[var(--radius-lg)] border border-[var(--color-error)]/40 bg-[var(--color-error-muted)]/20">
          <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-[var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <span className="rounded-full bg-[var(--color-error)] px-2 py-0.5 text-[length:var(--text-2xs)] text-white">
                UNMATCHED
              </span>
              {unmatchedRows.length} FIRA
              {unmatchedRows.length === 1 ? ' has' : 's have'} no match
            </span>
          </summary>
          <div className="space-y-4 border-t border-[var(--color-border)] px-4 py-4">
            {unmatchedRows.map((row) => {
              const f = firaByRef.get(row.match.firaReferenceNumber)
              const search = manualSearch[`u-${row.id}`] ?? ''
              return (
                <div
                  key={row.id}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4"
                >
                  {f ? (
                    <PairSummary
                      firaRef={f.parsed.referenceNumber}
                      amountInr={f.parsed.creditedAmountInr.value}
                      date={f.parsed.valueDateIso}
                      remitter={f.parsed.remitterName}
                      invoiceNo={null}
                      invAmount={null}
                      invDate={null}
                      client={null}
                    />
                  ) : null}
                  <label className="mt-3 block text-[length:var(--text-xs)] font-medium">
                    Find invoice manually
                  </label>
                  <input
                    type="search"
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-[length:var(--text-sm)]"
                    value={search}
                    onChange={(e) =>
                      setManualSearch((m) => ({
                        ...m,
                        [`u-${row.id}`]: e.target.value,
                      }))
                    }
                  />
                  <select
                    className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-[length:var(--text-sm)]"
                    defaultValue=""
                    aria-label="Link FIRA to invoice"
                    onChange={(e) => {
                      const v = e.target.value
                      if (!v) return
                      overrideMut.mutate(
                        { id: row.id, no: v },
                        {
                          onSuccess: () => {
                            void approveMut.mutateAsync(row.id)
                          },
                        },
                      )
                      e.target.value = ''
                    }}
                  >
                    <option value="">Select invoice to link…</option>
                    {filterInvoices(search).map((i) => (
                      <option key={i.id} value={i.parsed.invoiceNumber}>
                        {i.parsed.invoiceNumber} — {i.parsed.client.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      addSkipped(row.id)
                      toast.success('FIRA excluded from this refund run')
                    }}
                  >
                    Skip this FIRA (exclude from refund)
                  </Button>
                </div>
              )
            })}
          </div>
        </details>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => navigate('/')}>
          Dashboard
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => continueToReport()}
          loading={reportMut.isPending}
        >
          Generate CA report →
        </Button>
      </div>
    </div>
  )
}
