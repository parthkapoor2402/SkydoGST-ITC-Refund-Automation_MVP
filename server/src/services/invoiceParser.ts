import { parseEuropeanAmount } from '../modules/firaParser.js'
import {
  validateGSTINFormat,
  validateLUTNumber as validateLUTFormat,
} from '../modules/invoiceParser.js'

export interface GstinValidationResult {
  valid: boolean
  normalized: string | null
}

export interface ClientDetails {
  name: string | null
  country: string | null
}

export interface DuplicateInvoiceResult {
  duplicates: string[]
  unique: string[]
}

export function parseInvoiceNumber(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  const invLabel = /invoice\s*no\.?\s*:?\s*(INV-\d+)/i.exec(s)
  if (invLabel) return invLabel[1]

  const invDash = /(INV-\d{3,})/i.exec(s)
  if (invDash && s.length === invDash[0].length) return invDash[1]

  if (/^INV\d+$/i.test(s)) return s.toUpperCase()

  if (/^\d{4}-\d+$/i.test(s)) return s

  const wordDashNum = /^([A-Za-z]{2,}-\d+)$/i.exec(s)
  if (wordDashNum) return wordDashNum[1]

  return null
}

export function parseInvoiceAmount(
  raw: string,
  currency?: string,
): number | null {
  const c = (currency ?? '').toUpperCase()
  const s = raw.trim()
  if (!s) return null

  if (c === 'EUR') {
    const stripped = s.replace(/€/g, '').replace(/\bEUR\b/gi, '').trim()
    return parseEuropeanAmount(stripped)
  }

  if (c === 'GBP') {
    const stripped = s
      .replace(/£/g, '')
      .replace(/\bGBP\b/gi, '')
      .replace(/,/g, '')
      .trim()
    const n = Number(stripped)
    return Number.isFinite(n) ? n : null
  }

  const stripped = s
    .replace(/\$/g, '')
    .replace(/\bUSD\b/gi, '')
    .replace(/,/g, '')
    .trim()
  const n = Number(stripped)
  return Number.isFinite(n) ? n : null
}

export function parseGSTIN(raw: string): GstinValidationResult {
  return validateGSTINFormat(raw)
}

export function parseLUTNumber(text: string): string | null {
  const t = text.trim()
  if (!t) return null

  const m = t.match(/\b(AD\d{10,})\b/i)
  if (m && validateLUTFormat(m[1])) return m[1].toUpperCase()

  if (validateLUTFormat(t)) return t.toUpperCase()

  return null
}

export function parseClientDetails(text: string): ClientDetails {
  const t = text.trim()

  let m = /Bill\s*To:\s*([^·]+)\s*·\s*(.+)/i.exec(t)
  if (m) {
    return { name: m[1].trim(), country: m[2].trim() }
  }

  m = /Overseas\s+customer:\s*(.+?)\s*\(([^)]+)\)/i.exec(t)
  if (m) {
    return { name: m[1].trim(), country: m[2].trim() }
  }

  m = /Client:\s*(.+?)\s*\/\s*(.+)/i.exec(t)
  if (m) {
    return { name: m[1].trim(), country: m[2].trim() }
  }

  return { name: null, country: null }
}

function invoiceKey(raw: string): string {
  const n = parseInvoiceNumber(raw.trim())
  const base = n ?? raw.trim()
  return base.toUpperCase()
}

export function handleDuplicateInvoice(numbers: string[]): DuplicateInvoiceResult {
  const keys = numbers.map(invoiceKey)
  const freq = new Map<string, number>()
  for (const k of keys) {
    freq.set(k, (freq.get(k) ?? 0) + 1)
  }

  const duplicates = [
    ...new Set(keys.filter((k) => (freq.get(k) ?? 0) > 1)),
  ]
  const unique = [...new Set(keys.filter((k) => (freq.get(k) ?? 0) === 1))]

  return { duplicates, unique }
}
