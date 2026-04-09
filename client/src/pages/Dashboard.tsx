import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ProgressStepper } from '../components/ui/ProgressStepper'
import { pathnameToProgressStepId } from '../lib/workflow'
import { useGSTStore } from '../store/useGSTStore'

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function Dashboard() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const firas = useGSTStore((s) => s.firas)
  const invoices = useGSTStore((s) => s.invoices)
  const matchResults = useGSTStore((s) => s.matchResults)

  const {
    matchedPairs,
    unmatchedItems,
    estimatedRefundInr,
    matchHealth,
  } = useMemo(() => {
    const matchedFira = new Set<string>()
    const matchedInvoice = new Set<string>()
    for (const m of matchResults) {
      if (m.invoiceId) {
        matchedFira.add(m.firaId)
        matchedInvoice.add(m.invoiceId)
      }
    }
    const matchedPairs = matchedFira.size
    const unmatchedItems =
      firas.length -
      matchedFira.size +
      (invoices.length - matchedInvoice.size)
    let refund = 0
    for (const inv of invoices) {
      if (matchedInvoice.has(inv.id)) {
        refund += inv.integratedTax
      }
    }
    let matchHealth: 'matched' | 'unmatched' | 'error' | 'pending' = 'pending'
    if (matchResults.length === 0 && firas.length === 0 && invoices.length === 0) {
      matchHealth = 'pending'
    } else if (unmatchedItems === 0 && matchedPairs > 0) {
      matchHealth = 'matched'
    } else if (unmatchedItems > 0 && matchedPairs > 0) {
      matchHealth = 'unmatched'
    } else if (matchedPairs === 0 && (firas.length > 0 || invoices.length > 0)) {
      matchHealth = 'error'
    }
    return {
      matchedPairs,
      unmatchedItems: Math.max(0, unmatchedItems),
      estimatedRefundInr: refund,
      matchHealth,
    }
  }, [firas, invoices, matchResults])

  return (
    <div className="mx-auto max-w-6xl space-y-[var(--space-8)]">
      <div className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[length:var(--text-2xl)] font-semibold tracking-tight text-[var(--color-text-primary)]">
            Overview
          </h2>
          <p className="mt-1 max-w-2xl text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            Track FIRA and invoice intake, matching progress, and the IGST
            position driving your RFD-01 Statement 3B preparation.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="md"
          aria-label="Go to upload documents"
          onClick={() => navigate('/upload')}
        >
          Upload documents
        </Button>
      </div>

      <Card
        elevation="raised"
        header="Workflow"
        headerDescription="Where you are in the end-to-end refund preparation flow."
        padding="md"
      >
        <ProgressStepper
          currentStepId={pathnameToProgressStepId(pathname)}
        />
      </Card>

      <section aria-labelledby="dashboard-stats-heading">
        <h2
          id="dashboard-stats-heading"
          className="mb-[var(--space-4)] text-[length:var(--text-md)] font-semibold text-[var(--color-text-primary)]"
        >
          Summary
        </h2>
        <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 xl:grid-cols-3">
          <Card elevation="flat" padding="md" className="h-full">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Total FIRAs uploaded
                </p>
                <p
                  className="mt-2 text-[length:var(--text-3xl)] font-semibold tabular-nums text-[var(--color-text-primary)]"
                  aria-live="polite"
                >
                  {firas.length}
                </p>
              </div>
              <Badge variant={firas.length > 0 ? 'matched' : 'pending'}>
                {firas.length > 0 ? 'Received' : 'Awaiting'}
              </Badge>
            </div>
          </Card>

          <Card elevation="flat" padding="md" className="h-full">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Invoices uploaded
                </p>
                <p
                  className="mt-2 text-[length:var(--text-3xl)] font-semibold tabular-nums text-[var(--color-text-primary)]"
                  aria-live="polite"
                >
                  {invoices.length}
                </p>
              </div>
              <Badge variant={invoices.length > 0 ? 'matched' : 'pending'}>
                {invoices.length > 0 ? 'Received' : 'Awaiting'}
              </Badge>
            </div>
          </Card>

          <Card elevation="flat" padding="md" className="h-full">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Matched pairs
                </p>
                <p
                  className="mt-2 text-[length:var(--text-3xl)] font-semibold tabular-nums text-[var(--color-text-primary)]"
                  aria-live="polite"
                >
                  {matchedPairs}
                </p>
              </div>
              <Badge variant={matchHealth}>
                {matchHealth === 'matched'
                  ? 'Complete'
                  : matchHealth === 'unmatched'
                    ? 'In progress'
                    : matchHealth === 'error'
                      ? 'Action needed'
                      : 'Idle'}
              </Badge>
            </div>
          </Card>

          <Card elevation="flat" padding="md" className="h-full">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Unmatched items
                </p>
                <p
                  className="mt-2 text-[length:var(--text-3xl)] font-semibold tabular-nums text-[var(--color-text-primary)]"
                  aria-live="polite"
                >
                  {unmatchedItems}
                </p>
              </div>
              <Badge variant={unmatchedItems === 0 ? 'matched' : 'unmatched'}>
                {unmatchedItems === 0 ? 'Clear' : 'Review'}
              </Badge>
            </div>
          </Card>

          <Card elevation="flat" padding="md" className="h-full sm:col-span-2 xl:col-span-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Estimated refund (IGST on matched)
                </p>
                <p
                  className="mt-2 text-[length:var(--text-3xl)] font-semibold tabular-nums text-[var(--color-text-primary)]"
                  aria-live="polite"
                >
                  {formatInr(estimatedRefundInr)}
                </p>
                <p className="mt-2 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                  Sum of integrated tax on invoices currently linked to a FIRA.
                  Final refund per Form RFD-01 and portal validation.
                </p>
              </div>
              <Badge variant={estimatedRefundInr > 0 ? 'matched' : 'pending'}>
                {estimatedRefundInr > 0 ? 'Computed' : '—'}
              </Badge>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
