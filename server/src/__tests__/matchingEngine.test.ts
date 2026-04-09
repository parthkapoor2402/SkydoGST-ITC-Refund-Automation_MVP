import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as grokClient from '../services/grokClient'
import {
  clientNameFuzzyMatch,
  confidenceScoring,
  dateProximityMatch,
  disambiguateMatchesWithGrok,
  exactAmountMatch,
  multipleMatchConflict,
  noMatchFound,
  toleranceMatch,
} from '../services/matchingEngine'
import { goldenMatchedPairs, intentionallyUnmatched } from './mocks/mockData'

vi.mock('../services/grokClient', () => ({
  completeJson: vi.fn(),
}))

describe('matchingEngine', () => {
  beforeEach(() => {
    vi.mocked(grokClient.completeJson).mockReset()
  })

  describe('exactAmountMatch', () => {
    it('matches FIRA INR amount to invoice total when equal', () => {
      expect(exactAmountMatch(1_035_000, 1_035_000)).toBe(true)
    })

    it('does not match when amounts differ', () => {
      expect(exactAmountMatch(1_035_000, 1_000_000)).toBe(false)
    })
  })

  describe('toleranceMatch', () => {
    it('matches within 2% tolerance (bank charges)', () => {
      const base = 100_000
      const withCharges = 101_500
      expect(toleranceMatch(base, withCharges, 0.02)).toBe(true)
    })

    it('rejects beyond tolerance', () => {
      expect(toleranceMatch(100_000, 110_000, 0.02)).toBe(false)
    })
  })

  describe('dateProximityMatch', () => {
    it('returns true when dates within 7-day window', () => {
      expect(
        dateProximityMatch('2025-03-15', '2025-03-14', 7),
      ).toBe(true)
    })

    it('returns false outside window', () => {
      expect(
        dateProximityMatch('2025-03-15', '2025-04-01', 7),
      ).toBe(false)
    })
  })

  describe('clientNameFuzzyMatch', () => {
    it('treats Acme Corp as matching ACME CORPORATION', () => {
      expect(clientNameFuzzyMatch('Acme Corp', 'ACME CORPORATION')).toBe(true)
    })
  })

  describe('multipleMatchConflict', () => {
    it('returns all candidates and flags ambiguity', () => {
      const candidates = [
        { firaId: 'f1', invoiceId: 'a', score: 0.9 },
        { firaId: 'f1', invoiceId: 'b', score: 0.88 },
      ]
      const r = multipleMatchConflict(candidates)
      expect(r.candidates).toHaveLength(2)
      expect(r.ambiguous).toBe(true)
    })
  })

  describe('noMatchFound', () => {
    it('returns unmatched object with reason', () => {
      const r = noMatchFound(intentionallyUnmatched.firaNoInvoice.reason)
      expect(r.unmatched).toBe(true)
      expect(r.reason).toBe('NO_INVOICE_CANDIDATE')
    })
  })

  describe('confidenceScoring', () => {
    it('returns high when amount, date, and name criteria met', () => {
      expect(
        confidenceScoring({ amount: true, date: true, name: true }),
      ).toBe('high')
    })

    it('returns medium when two of three met', () => {
      expect(
        confidenceScoring({ amount: true, date: true, name: false }),
      ).toBe('medium')
    })

    it('returns low when only one or none met', () => {
      expect(
        confidenceScoring({ amount: true, date: false, name: false }),
      ).toBe('low')
    })
  })

  describe('Grok disambiguation (mocked)', () => {
    it('does not call real API — uses vi.mocked completeJson', async () => {
      vi.mocked(grokClient.completeJson).mockResolvedValue({
        chosenInvoiceId: 'gi-1',
      })
      const res = await disambiguateMatchesWithGrok({ candidates: [] })
      expect(grokClient.completeJson).toHaveBeenCalledTimes(1)
      expect(res?.chosenInvoiceId).toBe('gi-1')
    })
  })

  describe('golden matched pairs (integration-style)', () => {
    it('first pair should be exact amount match', () => {
      const p = goldenMatchedPairs[0]
      expect(exactAmountMatch(p.fira.amountInr, p.invoice.invoiceValue)).toBe(
        true,
      )
    })
  })
})
