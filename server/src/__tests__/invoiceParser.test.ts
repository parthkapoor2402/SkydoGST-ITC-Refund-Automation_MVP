import { describe, expect, it } from 'vitest'
import {
  handleDuplicateInvoice,
  parseClientDetails,
  parseGSTIN,
  parseInvoiceAmount,
  parseInvoiceNumber,
  parseLUTNumber,
} from '../services/invoiceParser'
import {
  mockInvoiceDupA,
  mockInvoiceDupB,
  mockInvoiceInv001,
  mockInvoiceInvPlain,
  mockInvoiceYearFmt,
} from './mocks/mockData'

describe('invoiceParser', () => {
  describe('parseInvoiceNumber', () => {
    it('normalizes INV-001 style', () => {
      expect(parseInvoiceNumber('Invoice No: INV-001')).toBe('INV-001')
    })

    it('normalizes INV001 style', () => {
      expect(parseInvoiceNumber('INV001')).toBe('INV001')
    })

    it('normalizes 2024-001 style', () => {
      expect(parseInvoiceNumber('2024-001')).toBe('2024-001')
    })
  })

  describe('parseInvoiceAmount', () => {
    it('parses USD with symbol and grouping', () => {
      expect(parseInvoiceAmount(mockInvoiceInv001.amountRaw, 'USD')).toBe(
        mockInvoiceInv001.amountValue,
      )
    })

    it('parses GBP prefix', () => {
      expect(parseInvoiceAmount(mockInvoiceInvPlain.amountRaw, 'GBP')).toBe(
        mockInvoiceInvPlain.amountValue,
      )
    })

    it('parses EUR with European formatting', () => {
      expect(parseInvoiceAmount(mockInvoiceYearFmt.amountRaw, 'EUR')).toBe(
        mockInvoiceYearFmt.amountValue,
      )
    })
  })

  describe('parseGSTIN', () => {
    it('accepts valid 15-character GSTIN', () => {
      const r = parseGSTIN(mockInvoiceInv001.gstin)
      expect(r.valid).toBe(true)
      expect(r.normalized).toBe(mockInvoiceInv001.gstin.toUpperCase())
    })

    it('rejects GSTIN with wrong length', () => {
      const r = parseGSTIN('27AABCU9603R1Z')
      expect(r.valid).toBe(false)
      expect(r.normalized).toBeNull()
    })

    it('rejects GSTIN with invalid checksum position pattern', () => {
      const r = parseGSTIN('27AABCU9603R1ZXX')
      expect(r.valid).toBe(false)
    })
  })

  describe('parseLUTNumber', () => {
    it('extracts LUT token from narrative', () => {
      const lut = parseLUTNumber(mockInvoiceInv001.lut)
      expect(lut).toBeTruthy()
      expect(String(lut)).toMatch(/AD\d+/i)
    })

    it('returns null when LUT missing', () => {
      expect(parseLUTNumber(mockInvoiceYearFmt.lut)).toBeNull()
    })
  })

  describe('parseClientDetails', () => {
    it('extracts overseas client name and country', () => {
      const r = parseClientDetails(mockInvoiceInv001.clientLine)
      expect(r.name).not.toBeNull()
      expect(String(r.name).toUpperCase()).toContain('ACME')
      expect(r.country).not.toBeNull()
      expect(String(r.country)).toMatch(/United States|US/i)
    })

    it('parses Beta Ltd line', () => {
      const r = parseClientDetails(mockInvoiceInvPlain.clientLine)
      expect(r.name).not.toBeNull()
      expect(String(r.name)).toContain('Beta')
      expect(r.country).not.toBeNull()
      expect(String(r.country)).toMatch(/UK|United Kingdom/i)
    })
  })

  describe('handleDuplicateInvoice', () => {
    it('flags duplicate invoice numbers case-insensitively', () => {
      const r = handleDuplicateInvoice([
        mockInvoiceDupA.invoiceNumberRaw,
        mockInvoiceDupB.invoiceNumberRaw,
        mockInvoiceInv001.invoiceNumberRaw,
      ])
      expect(r.duplicates.map((d) => d.toUpperCase())).toContain('DUP-100')
      expect(r.unique).toContain(mockInvoiceInv001.invoiceNumberNormalized)
    })
  })
})
