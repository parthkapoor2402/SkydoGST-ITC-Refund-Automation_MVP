export type SupportedFiraCurrency =
  | 'USD'
  | 'GBP'
  | 'EUR'
  | 'AUD'
  | 'SGD'
  | 'CAD'
  | 'INR'

export interface ParsedFIRA {
  documentType: 'FIRA'
  referenceNumber: string
  remitterName: string
  remitterCountry: string | null
  remitterBank: string | null
  amountForeign: { value: number; currency: SupportedFiraCurrency }
  creditedAmountInr: { value: number; currency: 'INR' }
  exchangeRate: number | null
  valueDateIso: string
  purposeCode: string | null
  beneficiaryGSTIN: string | null
}

export interface ParseError {
  error: string
  code: string
  fieldErrors?: Record<string, string>
}

export interface NormalisedAmount {
  foreignValue: number
  foreignCurrency: SupportedFiraCurrency
  inrEquivalent: number
}

const INR_PER_UNIT: Record<SupportedFiraCurrency, number> = {
  INR: 1,
  USD: 83,
  GBP: 105,
  EUR: 90,
  AUD: 55,
  SGD: 62,
  CAD: 61,
}

const VALID_PURPOSE_CODES = new Set([
  'P0101',
  'P0102',
  'P0104',
  'P0802',
  'P0803',
  'P0804',
  'P0805',
  'P0806',
  'P0807',
  'P0808',
  'P0809',
  'P0810',
  'P0811',
  'P0812',
])

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

export function validatePurposeCode(code: string): boolean {
  const c = code.trim().toUpperCase()
  return VALID_PURPOSE_CODES.has(c)
}

export function normaliseCurrencyAmount(
  value: number,
  currency: string,
): NormalisedAmount {
  const cur = currency.trim().toUpperCase() as SupportedFiraCurrency
  if (!(cur in INR_PER_UNIT)) {
    throw new Error(`Unsupported currency: ${currency}`)
  }
  const rate = INR_PER_UNIT[cur]
  return {
    foreignValue: value,
    foreignCurrency: cur,
    inrEquivalent: value * rate,
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function normaliseValueDateToIso(raw: string): string | null {
  const s = raw.trim()

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  }

  const dmySlash = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s)
  if (dmySlash) {
    const dd = Number(dmySlash[1])
    const mm = Number(dmySlash[2])
    const yyyy = dmySlash[3]
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${yyyy}-${pad2(mm)}-${pad2(dd)}`
    }
  }

  const mdyDash = /(\d{2})-(\d{2})-(\d{4})/.exec(s)
  if (mdyDash) {
    const mm = Number(mdyDash[1])
    const dd = Number(mdyDash[2])
    const yyyy = mdyDash[3]
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${yyyy}-${pad2(mm)}-${pad2(dd)}`
    }
  }

  const dmyDot = /(\d{2})\.(\d{2})\.(\d{4})/.exec(s)
  if (dmyDot) {
    const dd = Number(dmyDot[1])
    const mm = Number(dmyDot[2])
    const yyyy = dmyDot[3]
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${yyyy}-${pad2(mm)}-${pad2(dd)}`
    }
  }

  return null
}

export function parseEuropeanAmount(raw: string): number | null {
  const t = raw.trim()
  const withCommaDecimal = /^([\d.]+),(\d{1,2})$/.exec(t)
  if (withCommaDecimal) {
    const intPart = withCommaDecimal[1].replace(/\./g, '')
    const frac = withCommaDecimal[2]
    const n = Number(`${intPart}.${frac}`)
    return Number.isFinite(n) ? n : null
  }
  const n = Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function extractForeignAmountFromRecord(obj: Record<string, unknown>): {
  value: number
  currency: SupportedFiraCurrency
} | null {
  const direct = obj.amount
  if (isRecord(direct)) {
    const cur = String(direct.currency ?? '').toUpperCase()
    const val = direct.value
    if (typeof val === 'number' && Number.isFinite(val) && cur) {
      if (cur in INR_PER_UNIT) {
        return { value: val, currency: cur as SupportedFiraCurrency }
      }
    }
  }

  const orig = obj.amountOriginal
  if (typeof orig === 'string') {
    const gbp = /£\s*([\d,]+(?:\.\d+)?)/.exec(orig)
    if (gbp) {
      const n = Number(gbp[1].replace(/,/g, ''))
      if (Number.isFinite(n)) return { value: n, currency: 'GBP' }
    }
    const usd = /USD\s*([\d,]+(?:\.\d+)?)/i.exec(orig)
    if (usd) {
      const n = Number(usd[1].replace(/,/g, ''))
      if (Number.isFinite(n)) return { value: n, currency: 'USD' }
    }
  }

  const eurStr = obj.amountEur
  if (typeof eurStr === 'string') {
    const n = parseEuropeanAmount(eurStr)
    if (n !== null) return { value: n, currency: 'EUR' }
  }

  return null
}

function readCreditedInr(
  obj: Record<string, unknown>,
  foreign: { value: number; currency: SupportedFiraCurrency },
): { value: number; rate: number | null } {
  const ca = obj.creditedAmount
  if (isRecord(ca) && typeof ca.value === 'number') {
    const cur = String(ca.currency ?? 'INR').toUpperCase()
    if (cur === 'INR') {
      const er = obj.exchangeRate
      const rate =
        typeof er === 'number' && Number.isFinite(er) ? er : null
      return { value: ca.value, rate }
    }
  }

  const er = obj.exchangeRate
  if (typeof er === 'number' && Number.isFinite(er)) {
    return { value: foreign.value * er, rate: er }
  }

  const norm = normaliseCurrencyAmount(foreign.value, foreign.currency)
  return { value: norm.inrEquivalent, rate: INR_PER_UNIT[foreign.currency] }
}

function readReference(obj: Record<string, unknown>): string | null {
  const keys = [
    'referenceNumber',
    'utr',
    'reference',
    'endToEndId',
  ] as const
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function readRemitter(obj: Record<string, unknown>): string | null {
  const keys = ['remitterName', 'remitter', 'sender'] as const
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function readValueDateRaw(obj: Record<string, unknown>): string | null {
  const keys = ['valueDate', 'creditDate', 'bookingDate'] as const
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

export function parseFIRA(rawData: unknown): ParsedFIRA | ParseError {
  if (!isRecord(rawData)) {
    return {
      error: 'FIRA payload must be a JSON object',
      code: 'INVALID_ROOT',
    }
  }

  const fieldErrors: Record<string, string> = {}

  const docType = rawData.documentType
  if (docType !== undefined && docType !== 'FIRA') {
    return {
      error: 'Invalid documentType — expected FIRA',
      code: 'INVALID_DOCUMENT_TYPE',
      fieldErrors: { documentType: String(docType) },
    }
  }

  const referenceNumber = readReference(rawData)
  if (!referenceNumber) {
    fieldErrors.referenceNumber = 'Missing referenceNumber / UTR'
  }

  const remitterName = readRemitter(rawData)
  if (!remitterName) {
    fieldErrors.remitterName = 'Missing remitter name'
  }

  const amountForeign = extractForeignAmountFromRecord(rawData)
  if (!amountForeign) {
    fieldErrors.amount = 'Missing or invalid foreign amount'
  }

  const valueDateRaw = readValueDateRaw(rawData)
  const valueDateIso = valueDateRaw ? normaliseValueDateToIso(valueDateRaw) : null
  if (!valueDateIso) {
    fieldErrors.valueDate = 'Missing or invalid valueDate'
  }

  if (
    !referenceNumber ||
    !remitterName ||
    !amountForeign ||
    !valueDateIso
  ) {
    return {
      error: 'FIRA validation failed',
      code: 'VALIDATION_ERROR',
      fieldErrors,
    }
  }

  const { value: inrValue, rate } = readCreditedInr(rawData, amountForeign)

  const purposeRaw = rawData.purposeCode
  const purposeCode =
    typeof purposeRaw === 'string' && purposeRaw.trim()
      ? purposeRaw.trim().toUpperCase()
      : null

  const gstinRaw = rawData.beneficiaryGSTIN
  const beneficiaryGSTIN =
    typeof gstinRaw === 'string' && gstinRaw.trim()
      ? gstinRaw.trim().toUpperCase()
      : null

  const countryRaw = rawData.remitterCountry
  const remitterCountry =
    typeof countryRaw === 'string' && countryRaw.trim()
      ? countryRaw.trim()
      : null

  const bankRaw = rawData.remitterBank
  const remitterBank =
    typeof bankRaw === 'string' && bankRaw.trim() ? bankRaw.trim() : null

  return {
    documentType: 'FIRA',
    referenceNumber,
    remitterName,
    remitterCountry,
    remitterBank,
    amountForeign,
    creditedAmountInr: { value: inrValue, currency: 'INR' },
    exchangeRate: rate,
    valueDateIso,
    purposeCode,
    beneficiaryGSTIN,
  }
}

export function isParseError(r: ParsedFIRA | ParseError): r is ParseError {
  return 'error' in r && typeof (r as ParseError).error === 'string'
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function rowToSkydoObject(
  header: string[],
  row: string[],
): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  for (let i = 0; i < header.length; i++) {
    const key = header[i]?.trim()
    if (!key) continue
    o[key] = row[i] ?? ''
  }

  const doc = o.documentType
  if (!doc) o.documentType = 'FIRA'

  const amtVal = o.amountValue
  const amtCur = o.amountCurrency
  if (amtVal !== undefined && amtCur !== undefined) {
    const v =
      typeof amtVal === 'string'
        ? Number(String(amtVal).replace(/,/g, ''))
        : Number(amtVal)
    o.amount = { value: v, currency: String(amtCur).toUpperCase() }
  }

  const inrVal = o.creditedInr ?? o.creditedAmountValue
  if (inrVal !== undefined) {
    const v =
      typeof inrVal === 'string'
        ? Number(String(inrVal).replace(/,/g, ''))
        : Number(inrVal)
    o.creditedAmount = { value: v, currency: 'INR' }
  }

  const er = o.exchangeRate
  if (typeof er === 'string' && er.trim()) {
    o.exchangeRate = Number(er.replace(/,/g, ''))
  }

  return o
}

export function parseFIRAFromCSV(csvString: string): ParsedFIRA[] {
  const lines = csvString.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []

  const header = parseCsvLine(lines[0])
  const results: ParsedFIRA[] = []

  if (header.length === 1 && header[0].toLowerCase() === 'json') {
    for (let i = 1; i < lines.length; i++) {
      try {
        const raw = JSON.parse(lines[i]) as unknown
        const r = parseFIRA(raw)
        if (!isParseError(r)) results.push(r)
        else
          console.warn(
            `[firaParser] Skipping JSON CSV row ${i + 1}:`,
            r.error,
          )
      } catch (e) {
        console.warn(`[firaParser] Skipping malformed JSON CSV row ${i + 1}`, e)
      }
    }
    return results
  }

  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCsvLine(lines[i])
      if (row.every((c) => c === '')) continue
      const obj = rowToSkydoObject(header, row)
      const r = parseFIRA(obj)
      if (!isParseError(r)) results.push(r)
      else
        console.warn(`[firaParser] Skipping invalid CSV row ${i + 1}:`, r.error)
    } catch (e) {
      console.warn(`[firaParser] Skipping malformed CSV row ${i + 1}`, e)
    }
  }

  return results
}
