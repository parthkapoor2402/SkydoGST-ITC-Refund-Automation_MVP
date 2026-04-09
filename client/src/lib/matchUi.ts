import type { ApprovedMatchPayload, EngineMatchResultUI, MatchResultRowUI } from '../types'
import { mapParsedFiraToRecord, mapParsedInvoiceToRecord } from './gstMappers'
import type { ParsedFIRA, ParsedInvoice } from '../types/parser'

export function confidenceLabelToScore(confidence: string): number {
  switch (confidence) {
    case 'high':
      return 0.92
    case 'medium':
      return 0.78
    case 'low':
      return 0.48
    case 'ai-medium':
      return 0.64
    case 'ai-low':
      return 0.42
    default:
      return 0.55
  }
}

export function tierToAuditMethod(tier: number): ApprovedMatchPayload['matchMethod'] {
  if (tier === 1) return 'Exact'
  if (tier === 4) return 'AI'
  if (tier === 2 || tier === 3) return 'Fuzzy'
  return 'Manual'
}

export function describeMatchReason(m: EngineMatchResultUI): string {
  if (m.status === 'ai_suggested' && m.grok?.reasoning) {
    return `AI review: ${m.grok.reasoning}`
  }
  if (m.tier === 1) {
    return 'Matched by: Amount (within ₹1) + UTR / reference on payment advice'
  }
  if (m.tier === 2) {
    return 'Matched by: Amount (within 2%) + Date (within 7 days) + Client name (Acme Corp ≈ ACME CORPORATION-style fuzzy match)'
  }
  if (m.tier === 3) {
    return 'Matched by: Amount (within 5%) + Date (within 30 days) + Client country'
  }
  if (m.status === 'ambiguous') {
    return `Multiple possible invoices — pick the correct one. (${m.reason ?? 'ambiguous'})`
  }
  return m.reason ?? 'Please confirm this link or choose a different invoice.'
}

export function categorizeMatchRow(
  row: MatchResultRowUI,
  skippedIds: string[],
): 'auto' | 'review' | 'unmatched' | 'skipped' {
  if (skippedIds.includes(row.id)) return 'skipped'
  const s = row.match.status
  if (s === 'unmatched') return 'unmatched'
  if (s === 'auto_approved' || s === 'auto_approved_review_flag') return 'auto'
  return 'review'
}

export function asMatchResultRow(raw: {
  id: string
  match: unknown
  decision: string
  overrideInvoiceNumber?: string | null
  updatedAt: string
}): MatchResultRowUI {
  const m = raw.match as EngineMatchResultUI
  return {
    id: raw.id,
    match: m,
    decision: raw.decision as MatchResultRowUI['decision'],
    overrideInvoiceNumber: raw.overrideInvoiceNumber,
    updatedAt: raw.updatedAt,
  }
}

export function buildApprovedMatchesPayload(
  rows: MatchResultRowUI[],
  firas: Array<{ id: string; sourceFileName: string; parsed: ParsedFIRA }>,
  invoices: Array<{ id: string; sourceFileName: string; parsed: ParsedInvoice }>,
  skippedIds: string[],
): ApprovedMatchPayload[] {
  const out: ApprovedMatchPayload[] = []
  const now = new Date().toISOString()

  for (const row of rows) {
    if (skippedIds.includes(row.id)) continue
    if (row.decision !== 'approved' && row.decision !== 'overridden') continue

    const ref = row.match.firaReferenceNumber
    const invNo =
      row.overrideInvoiceNumber ?? row.match.matchedInvoiceNumber ?? null
    if (!invNo) continue

    const sf = firas.find((f) => f.parsed.referenceNumber === ref)
    const si = invoices.find((i) => i.parsed.invoiceNumber === invNo)
    if (!sf || !si) continue

    out.push({
      fira: mapParsedFiraToRecord(sf.id, sf.sourceFileName, sf.parsed),
      invoice: mapParsedInvoiceToRecord(si.id, si.sourceFileName, si.parsed),
      matchMethod: tierToAuditMethod(row.match.tier),
      matchConfidence: String(row.match.confidence),
      approvedBy: 'Exporter',
      approvedAt: now,
    })
  }

  return out
}
