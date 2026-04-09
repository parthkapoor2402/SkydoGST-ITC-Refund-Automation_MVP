import {
  extractForeignAmountFromRecord,
  isParseError,
  normaliseValueDateToIso,
  parseEuropeanAmount,
  parseFIRA,
} from '../modules/firaParser.js'

export type FiraCurrency = 'USD' | 'GBP' | 'EUR'

export interface ParsedFiraAmount {
  amount: number
  currency: FiraCurrency
}

export type FiraParseError = {
  error: string
  code?: string
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

export function parseAmountFromFIRA(
  input: string | Record<string, unknown>,
  currencyHint?: FiraCurrency,
): ParsedFiraAmount | null {
  if (typeof input === 'string') {
    const hint = currencyHint ?? 'USD'
    if (hint === 'GBP') {
      const g = /GBP\s*([\d,]+(?:\.\d+)?)/i.exec(input)
      if (g) {
        return {
          amount: Number(g[1].replace(/,/g, '')),
          currency: 'GBP',
        }
      }
      const pound = /£\s*([\d,]+(?:\.\d+)?)/.exec(input)
      if (pound) {
        return {
          amount: Number(pound[1].replace(/,/g, '')),
          currency: 'GBP',
        }
      }
    }
    if (hint === 'EUR') {
      const e = /EUR\s*([\d.,]+)/i.exec(input)
      if (e) {
        const n = parseEuropeanAmount(e[1])
        if (n !== null) return { amount: n, currency: 'EUR' }
      }
    }
    if (hint === 'USD') {
      const u = /USD\s*([\d,]+(?:\.\d+)?)/i.exec(input)
      if (u) {
        return {
          amount: Number(u[1].replace(/,/g, '')),
          currency: 'USD',
        }
      }
    }
    return null
  }

  const ex = extractForeignAmountFromRecord(input)
  if (!ex) return null
  const cur = ex.currency as FiraCurrency
  if (currencyHint && ex.currency !== currencyHint) return null
  return { amount: ex.value, currency: cur }
}

export function parseDateFromFIRA(text: string): string | null {
  return normaliseValueDateToIso(text)
}

export function parseClientNameFromFIRA(text: string): string | null {
  const rem = /Remitter:\s*([^\n\r]+)/i.exec(text)
  if (rem) return rem[1].trim()
  const ben = /Beneficiary narrative:\s*([^\n\r]+)/i.exec(text)
  if (ben) return ben[1].trim()
  const abs = /Absender:\s*([^\n\r]+)/i.exec(text)
  if (abs) return abs[1].trim()
  return null
}

export function parseUTRFromFIRA(text: string): string | null {
  const utr = /UTR:\s*(\S+)/i.exec(text)
  if (utr) return utr[1].trim()
  const ref = /Ref:\s*(\S+)/i.exec(text)
  if (ref) return ref[1].trim()
  const ere = /EREF\s+(\S+)/i.exec(text)
  if (ere) return ere[1].trim()
  return null
}

export function handleMalformedFIRA(input: unknown): FiraParseError {
  if (!isRecord(input)) {
    return { error: 'FIRA root must be an object', code: 'INVALID_ROOT' }
  }
  const merged: Record<string, unknown> = { ...input }
  if (isRecord(input.json)) {
    Object.assign(merged, input.json)
  }
  const r = parseFIRA(merged)
  if (isParseError(r)) {
    return { error: r.error, code: r.code }
  }
  return {
    error: 'Payload validated as FIRA but marked malformed in tests',
    code: 'UNEXPECTED_VALID',
  }
}

export function handleMissingFields(
  partial: Record<string, unknown>,
): Record<string, unknown> {
  const rawAmt = partial.amount
  const amt = isRecord(rawAmt) ? { ...rawAmt } : {}
  const hasValueKey = 'value' in amt
  const value = hasValueKey ? amt.value : undefined
  const hasCurrencyKey = 'currency' in amt
  const currency = hasCurrencyKey ? amt.currency : undefined

  return {
    ...partial,
    amount: {
      ...amt,
      currency: currency === undefined ? null : currency,
      value:
        value === undefined || value === null || value === ''
          ? null
          : value,
    },
  }
}
