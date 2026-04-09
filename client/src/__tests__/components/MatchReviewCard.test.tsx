import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  MatchReviewCard,
  type MatchReviewCardFira,
  type MatchReviewCardInvoice,
} from '../../components/MatchReviewCard'

const sampleFira: MatchReviewCardFira = {
  referenceNo: 'UTR7788990011',
  amountInr: 1_025_500,
  remitterNameRaw: 'Northwind Traders LLC',
  valueDate: '2025-04-01',
}

const sampleInvoice: MatchReviewCardInvoice = {
  invoiceNo: 'INV-2048',
  invoiceValue: 1_025_500,
  clientNameRaw: 'Northwind Traders LLC',
  invoiceDate: '2025-03-30',
}

describe('MatchReviewCard', () => {
  it('renders FIRA details correctly', () => {
    render(
      <MatchReviewCard
        fira={sampleFira}
        invoice={sampleInvoice}
        confidence={0.92}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    )
    expect(screen.getByText(sampleFira.referenceNo)).toBeInTheDocument()
    expect(screen.getByText(sampleFira.remitterNameRaw)).toBeInTheDocument()
  })

  it('renders matched invoice details', () => {
    render(
      <MatchReviewCard
        fira={sampleFira}
        invoice={sampleInvoice}
        confidence={0.88}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    )
    expect(screen.getByText(sampleInvoice.invoiceNo)).toBeInTheDocument()
    expect(screen.getByText(sampleInvoice.clientNameRaw)).toBeInTheDocument()
  })

  it('shows confidence badge', () => {
    render(
      <MatchReviewCard
        fira={sampleFira}
        invoice={sampleInvoice}
        confidence={0.81}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    )
    expect(screen.getByRole('status', { name: /81%/i })).toBeInTheDocument()
  })

  it('approve button calls onApprove handler', async () => {
    const user = userEvent.setup()
    const onApprove = vi.fn()
    render(
      <MatchReviewCard
        fira={sampleFira}
        invoice={sampleInvoice}
        confidence={0.9}
        onApprove={onApprove}
        onReject={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /approve/i }))
    expect(onApprove).toHaveBeenCalledTimes(1)
  })

  it('reject button calls onReject handler', async () => {
    const user = userEvent.setup()
    const onReject = vi.fn()
    render(
      <MatchReviewCard
        fira={sampleFira}
        invoice={sampleInvoice}
        confidence={0.55}
        onApprove={vi.fn()}
        onReject={onReject}
      />,
    )
    await user.click(screen.getByRole('button', { name: /reject/i }))
    expect(onReject).toHaveBeenCalledTimes(1)
  })

  it('manual override input appears when rejected', async () => {
    const user = userEvent.setup()
    render(
      <MatchReviewCard
        fira={sampleFira}
        invoice={sampleInvoice}
        confidence={0.4}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /reject/i }))
    expect(
      screen.getByRole('textbox', { name: /manual override invoice number/i }),
    ).toBeInTheDocument()
  })
})
