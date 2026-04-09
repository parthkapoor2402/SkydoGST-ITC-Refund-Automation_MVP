import { useState } from 'react'
import { Button } from './ui/Button'

export interface MatchReviewCardFira {
  referenceNo: string
  amountInr: number
  remitterNameRaw: string
  valueDate: string
}

export interface MatchReviewCardInvoice {
  invoiceNo: string
  invoiceValue: number
  clientNameRaw: string
  invoiceDate: string
}

export interface MatchReviewCardProps {
  fira: MatchReviewCardFira
  invoice: MatchReviewCardInvoice | null
  confidence: number
  onApprove: () => void
  onReject: () => void
}

export function MatchReviewCard({
  fira,
  invoice,
  confidence,
  onApprove,
  onReject,
}: MatchReviewCardProps) {
  const [rejected, setRejected] = useState(false)
  const pct = Math.round(confidence * 100)

  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <div
        role="status"
        aria-label={`${pct}% match confidence`}
        className="mb-3 text-[length:var(--text-sm)] font-medium text-[var(--color-text-primary)]"
      >
        Match confidence: {pct}%
      </div>

      <div className="space-y-2 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
        <p>
          <span className="font-medium text-[var(--color-text-primary)]">
            FIRA ref:
          </span>{' '}
          {fira.referenceNo}
        </p>
        {invoice &&
        invoice.clientNameRaw.trim() === fira.remitterNameRaw.trim() ? (
          <p>
            <span className="font-medium text-[var(--color-text-primary)]">
              Remitter & bill-to:
            </span>{' '}
            {fira.remitterNameRaw}
          </p>
        ) : (
          <>
            <p>
              <span className="font-medium text-[var(--color-text-primary)]">
                Remitter:
              </span>{' '}
              {fira.remitterNameRaw}
            </p>
            {invoice ? (
              <p>
                <span className="font-medium text-[var(--color-text-primary)]">
                  Client:
                </span>{' '}
                {invoice.clientNameRaw}
              </p>
            ) : null}
          </>
        )}
        {invoice ? (
          <p>
            <span className="font-medium text-[var(--color-text-primary)]">
              Invoice:
            </span>{' '}
            {invoice.invoiceNo}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="primary" onClick={onApprove}>
          Approve
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setRejected(true)
            onReject()
          }}
        >
          Reject
        </Button>
      </div>

      {rejected ? (
        <div className="mt-4">
          <label
            htmlFor={`override-${fira.referenceNo}`}
            className="mb-1 block text-[length:var(--text-sm)] text-[var(--color-text-primary)]"
          >
            Manual override invoice number
          </label>
          <input
            id={`override-${fira.referenceNo}`}
            type="text"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-[length:var(--text-sm)]"
            aria-label="Manual override invoice number"
          />
        </div>
      ) : null}
    </article>
  )
}
