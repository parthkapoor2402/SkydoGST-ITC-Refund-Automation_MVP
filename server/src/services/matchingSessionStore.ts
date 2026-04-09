import type { BatchMatchResult, MatchResult } from '../modules/matchingEngine.js'

export type UserMatchDecision = 'pending' | 'approved' | 'rejected' | 'overridden'

export interface MatchResultRow {
  id: string
  match: MatchResult
  decision: UserMatchDecision
  overrideInvoiceNumber?: string | null
  updatedAt: string
}

let rows: MatchResultRow[] = []
let lastBatch: BatchMatchResult | null = null

export function setMatchRun(batch: BatchMatchResult, rowIds: string[]): void {
  lastBatch = batch
  const now = new Date().toISOString()
  rows = batch.results.map((m, i) => ({
    id: rowIds[i]!,
    match: m,
    decision: 'pending',
    updatedAt: now,
  }))
}

export function getLastBatch(): BatchMatchResult | null {
  return lastBatch
}

export function listMatchRows(): MatchResultRow[] {
  return [...rows]
}

export function getMatchRow(id: string): MatchResultRow | undefined {
  return rows.find((r) => r.id === id)
}

export function approveMatchRow(id: string): boolean {
  const r = rows.find((x) => x.id === id)
  if (!r) return false
  r.decision = 'approved'
  r.updatedAt = new Date().toISOString()
  return true
}

export function rejectMatchRow(id: string): boolean {
  const r = rows.find((x) => x.id === id)
  if (!r) return false
  r.decision = 'rejected'
  r.updatedAt = new Date().toISOString()
  return true
}

export function clearMatchSession(): void {
  rows = []
  lastBatch = null
}

export function overrideMatchRow(
  id: string,
  invoiceNumber: string,
): boolean {
  const r = rows.find((x) => x.id === id)
  if (!r) return false
  r.decision = 'overridden'
  r.overrideInvoiceNumber = invoiceNumber
  r.match = {
    ...r.match,
    matchedInvoiceNumber: invoiceNumber,
    matchedInvoiceIndex: null,
    status: 'pending_user_confirmation',
    tier: 3,
    confidence: 'medium',
    reason: 'MANUAL_OVERRIDE',
  }
  r.updatedAt = new Date().toISOString()
  return true
}
