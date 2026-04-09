import type { FiraRecord, InvoiceRecord } from '../types/index.js'
import { completeJson } from './grokClient.js'

export type {
  BatchMatchResult,
  MatchCandidate,
  MatchConfidence,
  MatchResult,
  MatchTier,
  MultipleMatchResult,
  UnmatchedResult,
} from '../modules/matchingEngine.js'

export {
  calculateMatchConfidence,
  clientNameFuzzyMatch,
  confidenceScoring,
  dateProximityMatch,
  exactAmountMatch,
  fuzzyNameMatch,
  invoiceTotalInr,
  matchFIRAToInvoices,
  multipleMatchConflict,
  noMatchFound,
  runBatchMatching,
  toleranceMatch,
} from '../modules/matchingEngine.js'

const GROK_SYSTEM = `You are a GST compliance assistant for Indian exporters.
Analyse these FIRA and invoice documents and determine if they
represent the same transaction. Return JSON only.`

export async function disambiguateMatchesWithGrok(
  payload: unknown,
): Promise<{ chosenInvoiceId: string | null } | null> {
  const user =
    typeof payload === 'string'
      ? payload
      : `Disambiguate these match candidates and pick at most one invoice id. Payload: ${JSON.stringify(payload)}. Return JSON only: {"chosenInvoiceId": string|null} (use matchedInvoiceId instead if you prefer).`

  const res = await completeJson<{
    chosenInvoiceId?: string | null
    matchedInvoiceId?: string | null
  }>({ system: GROK_SYSTEM, user })

  if (!res) return null
  const chosen = res.chosenInvoiceId ?? res.matchedInvoiceId ?? null
  return { chosenInvoiceId: chosen }
}

export function scorePair(_fira: FiraRecord, _invoice: InvoiceRecord): number {
  return 0
}
