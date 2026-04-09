import type OpenAI from 'openai'
import type { ParsedFIRA } from './firaParser.js'
import type { ParsedInvoice } from './invoiceParser.js'

export interface MatchCandidate {
  firaId: string
  invoiceId: string
  score: number
}

export interface MultipleMatchResult {
  candidates: MatchCandidate[]
  ambiguous: boolean
}

export interface UnmatchedResult {
  unmatched: true
  reason: string
}

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type MatchConfidence = ConfidenceLevel

export type MatchTier = 1 | 2 | 3 | 4 | 5

export type EngineMatchStatus =
  | 'auto_approved'
  | 'auto_approved_review_flag'
  | 'pending_user_confirmation'
  | 'ai_suggested'
  | 'unmatched'
  | 'ambiguous'

/** Engine output for one FIRA ↔ invoice pairing attempt */
export interface MatchResult {
  tier: MatchTier
  status: EngineMatchStatus
  confidence: MatchConfidence | 'ai-low' | 'ai-medium'
  firaReferenceNumber: string
  matchedInvoiceNumber: string | null
  matchedInvoiceIndex: number | null
  candidates?: Array<{ invoiceIndex: number; invoiceNumber: string }>
  reviewFlag?: boolean
  reason?: string
  grok?: {
    matchedInvoiceId: string | null
    confidence: string
    reasoning: string
  }
}

export interface BatchMatchResult {
  results: MatchResult[]
  summary: {
    autoApproved: number
    pendingReview: number
    pendingUser: number
    aiSuggested: number
    unmatched: number
    ambiguous: number
  }
}

const EXACT_INR_TOLERANCE = 1

export function exactAmountMatch(amountInr: number, invoiceTotalInr: number): boolean {
  return Math.abs(amountInr - invoiceTotalInr) <= EXACT_INR_TOLERANCE
}

export function toleranceMatch(
  amountInr: number,
  invoiceTotalInr: number,
  tolerancePct: number,
): boolean {
  const denom = Math.max(Math.abs(amountInr), Math.abs(invoiceTotalInr), 1)
  return Math.abs(amountInr - invoiceTotalInr) / denom <= tolerancePct
}

function parseIsoDate(iso: string): number {
  const t = Date.parse(iso.slice(0, 10))
  return Number.isFinite(t) ? t : NaN
}

export function dateProximityMatch(
  firaDateIso: string,
  invoiceDateIso: string,
  windowDays: number,
): boolean {
  const a = parseIsoDate(firaDateIso)
  const b = parseIsoDate(invoiceDateIso)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  const diffMs = Math.abs(a - b)
  const days = diffMs / (86_400_000)
  return days <= windowDays
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const row = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) row[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = row[0]!
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = row[j]!
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + cost)
      prev = tmp
    }
  }
  return row[n]!
}

function normalizeName(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
}

/**
 * Word-aware similarity (handles "Corp" vs "Corporation") plus Levenshtein fallback.
 * Returns 0–1; Tier 2 uses threshold 0.85.
 */
export function fuzzyNameMatch(name1: string, name2: string): number {
  const w1 = normalizeName(name1).split(' ')
  const w2 = normalizeName(name2).split(' ')
  if (w1.length === 0 || w2.length === 0) {
    const a = normalizeName(name1).replace(/\s/g, '')
    const b = normalizeName(name2).replace(/\s/g, '')
    const mx = Math.max(a.length, b.length, 1)
    return 1 - levenshtein(a, b) / mx
  }

  let sum = 0
  let n = 0
  for (const t1 of w1) {
    let best = 0
    for (const t2 of w2) {
      if (t1 === t2) {
        best = 1
        break
      }
      if (
        t1.length >= 3 &&
        t2.length >= 3 &&
        (t1.startsWith(t2) || t2.startsWith(t1))
      ) {
        best = Math.max(best, 0.95)
        continue
      }
      const mx = Math.max(t1.length, t2.length, 1)
      best = Math.max(best, 1 - levenshtein(t1, t2) / mx)
    }
    sum += best
    n++
  }
  const tokenScore = n ? sum / n : 0

  const flat1 = w1.join('')
  const flat2 = w2.join('')
  const mx = Math.max(flat1.length, flat2.length, 1)
  const levScore = 1 - levenshtein(flat1, flat2) / mx

  return Math.max(tokenScore, levScore)
}

export function clientNameFuzzyMatch(a: string, b: string): boolean {
  return fuzzyNameMatch(a, b) >= 0.85
}

export function multipleMatchConflict(
  pairs: MatchCandidate[],
): MultipleMatchResult {
  return {
    candidates: pairs,
    ambiguous: pairs.length >= 2,
  }
}

export function noMatchFound(reason: string): UnmatchedResult {
  return { unmatched: true, reason }
}

export function confidenceScoring(criteria: {
  amount: boolean
  date: boolean
  name: boolean
}): ConfidenceLevel {
  const n =
    Number(criteria.amount) + Number(criteria.date) + Number(criteria.name)
  if (n >= 3) return 'high'
  if (n === 2) return 'medium'
  return 'low'
}

export function invoiceTotalInr(inv: ParsedInvoice): number {
  return inv.taxableValueInr + inv.igstAmount
}

function refMatches(fira: ParsedFIRA, inv: ParsedInvoice): boolean {
  const ref = fira.referenceNumber.trim().toUpperCase()
  const pr = inv.paymentReference?.trim().toUpperCase()
  if (!ref || !pr) return false
  return pr.includes(ref) || ref.includes(pr)
}

function invoiceDateForMatch(inv: ParsedInvoice): string {
  return inv.dueDate ?? inv.invoiceDate
}

function normalizeCountry(c: string | null | undefined): string | null {
  if (!c) return null
  const u = c.trim().toUpperCase()
  const map: Record<string, string> = {
    US: 'US',
    USA: 'US',
    'UNITED STATES': 'US',
    'UNITED STATES OF AMERICA': 'US',
    UK: 'UK',
    GB: 'UK',
    'UNITED KINGDOM': 'UK',
    'GREAT BRITAIN': 'UK',
    FR: 'FR',
    FRANCE: 'FR',
    IN: 'IN',
    INDIA: 'IN',
    SG: 'SG',
    SINGAPORE: 'SG',
    DE: 'DE',
    GERMANY: 'DE',
  }
  return map[u] ?? u
}

function countryMatches(fira: ParsedFIRA, inv: ParsedInvoice): boolean {
  const a = normalizeCountry(fira.remitterCountry)
  const b = normalizeCountry(inv.client.country)
  if (!a || !b) return false
  return a === b
}

export function calculateMatchConfidence(
  fira: ParsedFIRA,
  invoice: ParsedInvoice,
): MatchConfidence {
  const finr = fira.creditedAmountInr.value
  const iinr = invoiceTotalInr(invoice)
  const idate = invoiceDateForMatch(invoice)
  const amountExact = exactAmountMatch(finr, iinr)
  const amount2 = toleranceMatch(finr, iinr, 0.02)
  const date7 = dateProximityMatch(fira.valueDateIso, idate, 7)
  const nameOk = fuzzyNameMatch(fira.remitterName, invoice.client.name) >= 0.85

  return confidenceScoring({
    amount: amountExact || amount2,
    date: date7,
    name: nameOk,
  })
}

function indicesTier1(fira: ParsedFIRA, invoices: ParsedInvoice[]): number[] {
  const out: number[] = []
  const finr = fira.creditedAmountInr.value
  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i]!
    if (!exactAmountMatch(finr, invoiceTotalInr(inv))) continue
    if (!refMatches(fira, inv)) continue
    out.push(i)
  }
  return out
}

function indicesTier2(fira: ParsedFIRA, invoices: ParsedInvoice[]): number[] {
  const out: number[] = []
  const finr = fira.creditedAmountInr.value
  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i]!
    if (!toleranceMatch(finr, invoiceTotalInr(inv), 0.02)) continue
    if (!dateProximityMatch(fira.valueDateIso, invoiceDateForMatch(inv), 7)) {
      continue
    }
    if (fuzzyNameMatch(fira.remitterName, inv.client.name) < 0.85) continue
    out.push(i)
  }
  return out
}

function indicesTier3(fira: ParsedFIRA, invoices: ParsedInvoice[]): number[] {
  const out: number[] = []
  const finr = fira.creditedAmountInr.value
  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i]!
    if (!toleranceMatch(finr, invoiceTotalInr(inv), 0.05)) continue
    if (!dateProximityMatch(fira.valueDateIso, invoiceDateForMatch(inv), 30)) {
      continue
    }
    if (!countryMatches(fira, inv)) continue
    out.push(i)
  }
  return out
}

function candidateList(
  indices: number[],
  invoices: ParsedInvoice[],
): Array<{ invoiceIndex: number; invoiceNumber: string }> {
  return indices.map((i) => ({
    invoiceIndex: i,
    invoiceNumber: invoices[i]!.invoiceNumber,
  }))
}

const GROK_SYSTEM = `You are a GST compliance assistant for Indian exporters.
Analyse these FIRA and invoice documents and determine if they
represent the same transaction. Return JSON only.`

async function runGrokTier(
  grokClient: OpenAI,
  fira: ParsedFIRA,
  invoices: ParsedInvoice[],
): Promise<MatchResult['grok'] | null> {
  if (process.env.E2E_MOCK_GROK === '1') {
    /** Playwright manual-link scenario: stay unmatched instead of mock-suggesting the only invoice. */
    if (fira.referenceNumber === 'UTR-MO-01') {
      return null
    }
    const finr = fira.creditedAmountInr.value
    const ranked = invoices
      .map((inv, index) => ({
        index,
        inv,
        delta: Math.abs(finr - invoiceTotalInr(inv)),
      }))
      .sort((a, b) => a.delta - b.delta)
    const best = ranked[0]
    if (!best) return null
    return {
      matchedInvoiceId: best.inv.invoiceNumber,
      confidence: 'medium',
      reasoning:
        'AI-assisted match: remittance and invoice totals are in a similar band; confirm before filing.',
    }
  }

  const finr = fira.creditedAmountInr.value
  const ranked = invoices
    .map((inv, index) => ({
      index,
      inv,
      delta: Math.abs(finr - invoiceTotalInr(inv)),
    }))
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 5)

  const firaDetails = {
    referenceNumber: fira.referenceNumber,
    remitterName: fira.remitterName,
    remitterCountry: fira.remitterCountry,
    amountInr: fira.creditedAmountInr.value,
    valueDate: fira.valueDateIso,
  }

  const candidates = ranked.map(({ index, inv }) => ({
    invoiceNumber: inv.invoiceNumber,
    clientName: inv.client.name,
    clientCountry: inv.client.country,
    amountInrTotal: invoiceTotalInr(inv),
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
  }))

  const user = `FIRA: ${JSON.stringify(firaDetails)}. Invoices to check: ${JSON.stringify(candidates)}. Return: {"matchedInvoiceId": string|null, "confidence": "low"|"medium", "reasoning": string} where matchedInvoiceId is the invoiceNumber of the best match or null.`

  try {
    const res = await grokClient.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: GROK_SYSTEM },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
    })
    const text = res.choices[0]?.message?.content ?? ''
    const jsonMatch = /\{[\s\S]*\}/.exec(text)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0]) as {
      matchedInvoiceId?: string | null
      confidence?: string
      reasoning?: string
    }
    return {
      matchedInvoiceId: parsed.matchedInvoiceId ?? null,
      confidence: parsed.confidence ?? 'low',
      reasoning: parsed.reasoning ?? '',
    }
  } catch {
    return null
  }
}

export async function matchFIRAToInvoices(
  fira: ParsedFIRA,
  invoices: ParsedInvoice[],
  grokClient: OpenAI,
): Promise<MatchResult> {
  const ref = fira.referenceNumber

  if (invoices.length === 0) {
    return {
      tier: 5,
      status: 'unmatched',
      confidence: 'low',
      firaReferenceNumber: ref,
      matchedInvoiceNumber: null,
      matchedInvoiceIndex: null,
      reason: 'NO_INVOICE_CANDIDATE',
    }
  }

  const t1 = indicesTier1(fira, invoices)
  if (t1.length === 1) {
    const i = t1[0]!
    return {
      tier: 1,
      status: 'auto_approved',
      confidence: 'high',
      firaReferenceNumber: ref,
      matchedInvoiceNumber: invoices[i]!.invoiceNumber,
      matchedInvoiceIndex: i,
    }
  }
  if (t1.length > 1) {
    return {
      tier: 1,
      status: 'ambiguous',
      confidence: 'high',
      firaReferenceNumber: ref,
      matchedInvoiceNumber: null,
      matchedInvoiceIndex: null,
      candidates: candidateList(t1, invoices),
      reason: 'MULTIPLE_TIER1_MATCHES',
    }
  }

  const t2 = indicesTier2(fira, invoices)
  if (t2.length === 1) {
    const i = t2[0]!
    return {
      tier: 2,
      status: 'auto_approved_review_flag',
      confidence: 'high',
      firaReferenceNumber: ref,
      matchedInvoiceNumber: invoices[i]!.invoiceNumber,
      matchedInvoiceIndex: i,
      reviewFlag: true,
    }
  }
  if (t2.length > 1) {
    return {
      tier: 2,
      status: 'ambiguous',
      confidence: 'high',
      firaReferenceNumber: ref,
      matchedInvoiceNumber: null,
      matchedInvoiceIndex: null,
      candidates: candidateList(t2, invoices),
      reason: 'MULTIPLE_TIER2_MATCHES',
    }
  }

  const t3 = indicesTier3(fira, invoices)
  if (t3.length >= 1) {
    return {
      tier: 3,
      status: 'pending_user_confirmation',
      confidence: 'medium',
      firaReferenceNumber: ref,
      matchedInvoiceNumber:
        t3.length === 1 ? invoices[t3[0]!]!.invoiceNumber : null,
      matchedInvoiceIndex: t3.length === 1 ? t3[0]! : null,
      candidates: candidateList(t3, invoices),
    }
  }

  const grok = await runGrokTier(grokClient, fira, invoices)
  if (grok?.matchedInvoiceId) {
    const idx = invoices.findIndex(
      (x) => x.invoiceNumber === grok.matchedInvoiceId,
    )
    return {
      tier: 4,
      status: 'ai_suggested',
      confidence: grok.confidence === 'medium' ? 'ai-medium' : 'ai-low',
      firaReferenceNumber: ref,
      matchedInvoiceNumber: grok.matchedInvoiceId,
      matchedInvoiceIndex: idx >= 0 ? idx : null,
      grok,
    }
  }

  return {
    tier: 5,
    status: 'unmatched',
    confidence: 'low',
    firaReferenceNumber: ref,
    matchedInvoiceNumber: null,
    matchedInvoiceIndex: null,
    reason: 'NO_ALGORITHMIC_OR_AI_MATCH',
    grok: grok ?? undefined,
  }
}

export async function runBatchMatching(
  firas: ParsedFIRA[],
  invoices: ParsedInvoice[],
  grokClient: OpenAI,
): Promise<BatchMatchResult> {
  const results: MatchResult[] = []
  for (const fira of firas) {
    results.push(await matchFIRAToInvoices(fira, invoices, grokClient))
  }

  const summary = {
    autoApproved: 0,
    pendingReview: 0,
    pendingUser: 0,
    aiSuggested: 0,
    unmatched: 0,
    ambiguous: 0,
  }

  for (const r of results) {
    if (r.status === 'auto_approved') summary.autoApproved++
    else if (r.status === 'auto_approved_review_flag') summary.pendingReview++
    else if (r.status === 'pending_user_confirmation') summary.pendingUser++
    else if (r.status === 'ai_suggested') summary.aiSuggested++
    else if (r.status === 'ambiguous') summary.ambiguous++
    else summary.unmatched++
  }

  return { results, summary }
}
