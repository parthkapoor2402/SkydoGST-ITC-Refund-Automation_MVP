import { describe, expect, it } from 'vitest'
import {
  STATEMENT_3B_HEADERS,
  calculateTaxableValue,
  generateFullStatement,
  generateStatement3BRow,
  outputCSVFormat,
  validateBRCNumber,
  validateGSTIN,
} from '../services/rfd01Generator'
import { goldenMatchedPairs } from './mocks/mockData'

describe('rfd01Generator', () => {
  describe('generateStatement3BRow', () => {
    it('maps invoice + FIRA fields to GST Statement 3B columns', () => {
      const p = goldenMatchedPairs[0]
      const row = generateStatement3BRow(p.fira, p.invoice)
      expect(row.gstinOfSupplier).toBe(p.invoice.supplierGstin)
      expect(row.invoiceNo).toBe(p.invoice.invoiceNo)
      expect(row.invoiceDate).toMatch(/\d{2}-\d{2}-\d{4}/)
      expect(row.invoiceValue).toBe(p.invoice.invoiceValue)
      expect(row.taxableValue).toBe(p.invoice.taxableValue)
      expect(row.integratedTax).toBe(p.invoice.integratedTax)
      expect(row.brcFircNo).toBe(p.fira.referenceNo)
      expect(row.brcFircDate).toMatch(/\d{2}-\d{2}-\d{4}/)
    })
  })

  describe('validateGSTIN', () => {
    it('accepts valid GSTIN', () => {
      expect(validateGSTIN('27AABCU9603R1ZX')).toBe(true)
    })

    it('rejects invalid GSTIN', () => {
      expect(validateGSTIN('27AABCU9603R1Z')).toBe(false)
    })
  })

  describe('validateBRCNumber', () => {
    it('accepts typical UTR / FIRC style references', () => {
      expect(validateBRCNumber('HDFC0009988776655')).toBe(true)
      expect(validateBRCNumber('FIRC88332211')).toBe(true)
    })

    it('rejects empty or junk references', () => {
      expect(validateBRCNumber('')).toBe(false)
      expect(validateBRCNumber('!@#')).toBe(false)
    })
  })

  describe('calculateTaxableValue', () => {
    it('converts foreign amount to INR using supplied INR-per-unit rate', () => {
      const usdAmount = 1000
      const inrPerUsd = 83.25
      expect(calculateTaxableValue(usdAmount, inrPerUsd)).toBeCloseTo(
        83_250,
        2,
      )
    })
  })

  describe('generateFullStatement', () => {
    it('produces one row per matched pair', () => {
      const rows = generateFullStatement(
        goldenMatchedPairs.map((p) => ({ fira: p.fira, invoice: p.invoice })),
      )
      expect(rows).toHaveLength(goldenMatchedPairs.length)
    })
  })

  describe('outputCSVFormat', () => {
    it('uses GST Council RFD-01 Statement 3B column order and headers', () => {
      const p = goldenMatchedPairs[0]
      const row = generateStatement3BRow(p.fira, p.invoice)
      const csv = outputCSVFormat([row])
      const firstLine = csv.split(/\r?\n/).filter(Boolean)[0]
      expect(firstLine).toBe(STATEMENT_3B_HEADERS.join(','))
      const secondLine = csv.split(/\r?\n/).filter(Boolean)[1]
      expect(secondLine).toContain(row.invoiceNo)
    })
  })
})
