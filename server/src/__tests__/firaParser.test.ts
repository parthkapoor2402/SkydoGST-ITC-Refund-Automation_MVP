import { describe, expect, it } from 'vitest'
import {
  handleMalformedFIRA,
  handleMissingFields,
  parseAmountFromFIRA,
  parseClientNameFromFIRA,
  parseDateFromFIRA,
  parseUTRFromFIRA,
} from '../services/firaParser'
import {
  mockFiraJsonEur1,
  mockFiraJsonGbp1,
  mockFiraJsonUsd1,
  mockFiraMalformed,
  mockFiraMissingFields,
} from './mocks/mockData'

describe('firaParser', () => {
  describe('parseAmountFromFIRA', () => {
    it('extracts USD amount from JSON fixture', () => {
      const r = parseAmountFromFIRA(mockFiraJsonUsd1.json, 'USD')
      expect(r).not.toBeNull()
      expect(r?.currency).toBe('USD')
      expect(r?.amount).toBeCloseTo(mockFiraJsonUsd1.expectedAmountOriginal, 2)
    })

    it('extracts GBP amount from raw text fixture', () => {
      const r = parseAmountFromFIRA(mockFiraJsonGbp1.rawText, 'GBP')
      expect(r).not.toBeNull()
      expect(r?.currency).toBe('GBP')
      expect(r?.amount).toBeCloseTo(mockFiraJsonGbp1.expectedAmountOriginal, 2)
    })

    it('extracts EUR amount from JSON fixture (European decimal format)', () => {
      const r = parseAmountFromFIRA(mockFiraJsonEur1.json, 'EUR')
      expect(r).not.toBeNull()
      expect(r?.currency).toBe('EUR')
      expect(r?.amount).toBeCloseTo(mockFiraJsonEur1.expectedAmountOriginal, 2)
    })
  })

  describe('parseDateFromFIRA', () => {
    it('parses DD/MM/YYYY to ISO date', () => {
      expect(parseDateFromFIRA('Value Date: 15/03/2025')).toBe('2025-03-15')
    })

    it('parses MM-DD-YYYY to ISO date', () => {
      expect(parseDateFromFIRA('credited on 03-25-2025')).toBe('2025-03-25')
    })

    it('parses European DD.MM.YYYY to ISO date', () => {
      expect(parseDateFromFIRA('Datum 28.12.2024')).toBe('2024-12-28')
    })
  })

  describe('parseClientNameFromFIRA', () => {
    it('extracts remitter name from narrative', () => {
      expect(parseClientNameFromFIRA(mockFiraJsonUsd1.rawText)).toBe(
        mockFiraJsonUsd1.expectedRemitter,
      )
    })

    it('extracts remitter from GBP raw text', () => {
      expect(parseClientNameFromFIRA(mockFiraJsonGbp1.rawText)).toBe(
        mockFiraJsonGbp1.expectedRemitter,
      )
    })
  })

  describe('parseUTRFromFIRA', () => {
    it('extracts UTR / bank reference from text', () => {
      expect(parseUTRFromFIRA(mockFiraJsonUsd1.rawText)).toBe(
        mockFiraJsonUsd1.expectedUtr,
      )
    })

    it('extracts reference from GBP advice', () => {
      expect(parseUTRFromFIRA(mockFiraJsonGbp1.rawText)).toBe(
        mockFiraJsonGbp1.expectedUtr,
      )
    })
  })

  describe('handleMalformedFIRA', () => {
    it('returns an error object and does not throw', () => {
      expect(() => handleMalformedFIRA(mockFiraMalformed)).not.toThrow()
      const res = handleMalformedFIRA(mockFiraMalformed)
      expect(typeof res.error).toBe('string')
      expect(res.error.length).toBeGreaterThan(0)
    })
  })

  describe('handleMissingFields', () => {
    it('marks absent fields as null (not undefined)', () => {
      const out = handleMissingFields(
        mockFiraMissingFields.json as Record<string, unknown>,
      )
      expect(out).toHaveProperty('amount')
      expect(out.amount).toEqual(
        expect.objectContaining({
          currency: 'USD',
          value: null,
        }),
      )
    })
  })
})
