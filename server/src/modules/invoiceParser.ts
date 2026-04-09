export interface GstinValidationResult {
  valid: boolean
  normalized: string | null
}

export interface InvoiceParseError {
  error: string
  code: string
  fieldErrors?: Record<string, string>
}

export type PaymentStatus = 'paid' | 'pending' | 'partial'

export interface ParsedInvoiceLineItem {
  description: string
  sacCode: string
  quantity: number
  unitPrice: number
  currency: string
}

export interface ParsedInvoice {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string | null
  exporterGSTIN: string
  lutNumber: string | null
  hasValidLut: boolean
  client: {
    name: string
    country: string
    address: string | null
  }
  lineItems: ParsedInvoiceLineItem[]
  totalAmount: { value: number; currency: string }
  taxableValueInr: number
  igstAmount: number
  paymentStatus: PaymentStatus
  /** UTR / bank reference for FIRA ↔ invoice matching */
  paymentReference: string | null
}

const GSTIN_RE =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

const SAC_SERVICES_RE = /^99[0-9]{4}$/

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

export function validateGSTINFormat(raw: string): GstinValidationResult {
  const s = raw.trim().toUpperCase()
  if (s.length !== 15) {
    return { valid: false, normalized: null }
  }
  if (!GSTIN_RE.test(s)) {
    return { valid: false, normalized: null }
  }
  return { valid: true, normalized: s }
}

export function validateLUTNumber(lut: string): boolean {
  const s = lut.trim().toUpperCase()
  if (!s.startsWith('AD')) return false
  return /^AD\d{2}\d{2}\d{2}\d{6,10}$/.test(s)
}

export function calculateIGSTLiability(invoice: ParsedInvoice): number {
  if (invoice.hasValidLut) {
    if (invoice.igstAmount > 0) {
      console.warn(
        '[invoiceParser] IGST amount > 0 on LUT-covered export (expected zero-rated)',
      )
    }
    return 0
  }
  return invoice.igstAmount
}

function readString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function readNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(/,/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function readPaymentStatus(v: unknown): PaymentStatus | null {
  if (v === 'paid' || v === 'pending' || v === 'partial') return v
  return null
}

function lineSum(items: ParsedInvoiceLineItem[]): number {
  return items.reduce((s, li) => s + li.quantity * li.unitPrice, 0)
}

function validateSacCode(code: string): boolean {
  return SAC_SERVICES_RE.test(code.trim())
}

export function isInvoiceParseError(
  r: ParsedInvoice | InvoiceParseError,
): r is InvoiceParseError {
  return 'error' in r && typeof (r as InvoiceParseError).error === 'string'
}

export function parseInvoice(rawData: unknown): ParsedInvoice | InvoiceParseError {
  if (!isRecord(rawData)) {
    return {
      error: 'Invoice payload must be a JSON object',
      code: 'INVALID_ROOT',
    }
  }

  const fieldErrors: Record<string, string> = {}

  const invoiceNumber =
    readString(rawData.invoiceNumber) ?? readString(rawData.invoiceNo)
  if (!invoiceNumber) {
    fieldErrors.invoiceNumber = 'Missing invoiceNumber'
  }

  const invoiceDate = readString(rawData.invoiceDate)
  if (!invoiceDate) {
    fieldErrors.invoiceDate = 'Missing invoiceDate'
  }

  const gstinRaw =
    readString(rawData.exporterGSTIN) ??
    readString(rawData.supplierGstin) ??
    readString(rawData.gstin)
  const gstin = gstinRaw ? validateGSTINFormat(gstinRaw) : null
  if (!gstin?.valid) {
    fieldErrors.exporterGSTIN = 'Invalid or missing GSTIN (15-char format)'
  }

  const lutRaw = readString(rawData.lutNumber) ?? readString(rawData.lut)
  const hasLutToken = Boolean(lutRaw)
  const lutValid = lutRaw ? validateLUTNumber(lutRaw) : false
  if (hasLutToken && !lutValid) {
    fieldErrors.lutNumber = 'Invalid LUT format'
  }

  const clientObj = rawData.client
  let clientName: string | null = null
  let clientCountry: string | null = null
  let clientAddress: string | null = null
  if (isRecord(clientObj)) {
    clientName = readString(clientObj.name)
    clientCountry = readString(clientObj.country)
    clientAddress = readString(clientObj.address)
  }
  if (!clientName) {
    fieldErrors.client = 'Missing client.name'
  }
  if (!clientCountry) {
    fieldErrors.client = fieldErrors.client ?? 'Missing client.country'
  }

  const lineItemsRaw = rawData.lineItems
  const lineItems: ParsedInvoiceLineItem[] = []
  if (!Array.isArray(lineItemsRaw) || lineItemsRaw.length === 0) {
    fieldErrors.lineItems = 'At least one line item required'
  } else {
    for (let i = 0; i < lineItemsRaw.length; i++) {
      const row = lineItemsRaw[i]
      if (!isRecord(row)) {
        fieldErrors.lineItems = `Line ${i + 1} is not an object`
        break
      }
      const sac = readString(row.sacCode) ?? readString(row.sac)
      if (!sac || !validateSacCode(sac)) {
        fieldErrors.lineItems = `Line ${i + 1}: invalid or missing SAC (services 99xxxx)`
        break
      }
      const desc = readString(row.description) ?? ''
      const qty = readNumber(row.quantity)
      const unit = readNumber(row.unitPrice) ?? readNumber(row.unit_price)
      const cur = readString(row.currency) ?? 'INR'
      if (qty === null || unit === null) {
        fieldErrors.lineItems = `Line ${i + 1}: quantity and unitPrice required`
        break
      }
      lineItems.push({
        description: desc,
        sacCode: sac,
        quantity: qty,
        unitPrice: unit,
        currency: cur,
      })
    }
  }

  const totalBlock = rawData.totalAmount
  let totalValue: number | null = null
  let totalCurrency = 'INR'
  if (isRecord(totalBlock)) {
    totalValue = readNumber(totalBlock.value)
    const c = readString(totalBlock.currency)
    if (c) totalCurrency = c.toUpperCase()
  }
  if (totalValue === null) {
    fieldErrors.totalAmount = 'Missing totalAmount.value'
  }

  const taxBlock = rawData.taxableValue
  let taxableInr: number | null = null
  if (isRecord(taxBlock)) {
    taxableInr = readNumber(taxBlock.inr)
  }
  if (taxableInr === null) {
    const flat = readNumber(rawData.taxableValueInr)
    if (flat !== null) taxableInr = flat
  }
  if (taxableInr === null) {
    fieldErrors.taxableValue = 'Missing taxableValue.inr'
  }

  const igstRaw = rawData.igstAmount ?? rawData.integratedTax
  const igstAmount = readNumber(igstRaw) ?? 0

  const pay = readPaymentStatus(rawData.paymentStatus)
  if (!pay) {
    fieldErrors.paymentStatus = 'paymentStatus must be paid | pending | partial'
  }

  const dueDate = readString(rawData.dueDate)
  const paymentReference =
    readString(rawData.paymentReference) ??
    readString(rawData.utr) ??
    readString(rawData.paymentRef)

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: 'Invoice validation failed',
      code: 'VALIDATION_ERROR',
      fieldErrors,
    }
  }

  if (
    !invoiceNumber ||
    !invoiceDate ||
    !gstin?.valid ||
    !gstin.normalized ||
    !clientName ||
    !clientCountry ||
    totalValue === null ||
    taxableInr === null ||
    !pay ||
    lineItems.length === 0
  ) {
    return {
      error: 'Invoice validation failed',
      code: 'VALIDATION_ERROR',
      fieldErrors,
    }
  }

  const computed = lineSum(lineItems)
  const tol = 0.02
  if (Math.abs(computed - totalValue) > tol) {
    return {
      error: `Line items sum ${computed} does not match totalAmount.value ${totalValue}`,
      code: 'TOTAL_MISMATCH',
      fieldErrors: {
        totalAmount: `Expected ~${computed}, got ${totalValue}`,
      },
    }
  }

  return {
    invoiceNumber,
    invoiceDate,
    dueDate,
    exporterGSTIN: gstin.normalized,
    lutNumber: lutRaw && lutValid ? lutRaw.trim().toUpperCase() : null,
    hasValidLut: lutValid,
    client: {
      name: clientName,
      country: clientCountry,
      address: clientAddress,
    },
    lineItems,
    totalAmount: { value: totalValue, currency: totalCurrency },
    taxableValueInr: taxableInr,
    igstAmount,
    paymentStatus: pay,
    paymentReference,
  }
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

function rowToInvoiceRecord(
  header: string[],
  row: string[],
): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  for (let i = 0; i < header.length; i++) {
    const key = header[i]?.trim()
    if (!key) continue
    o[key] = row[i] ?? ''
  }

  const lineJson = o.lineItemsJson
  if (typeof lineJson === 'string' && lineJson.trim()) {
    try {
      o.lineItems = JSON.parse(lineJson) as unknown
    } catch {
      /* ignore */
    }
  }

  const totalVal = o.totalAmountValue ?? o.totalValue
  const totalCur = o.totalAmountCurrency ?? o.totalCurrency
  if (totalVal !== undefined && totalVal !== '') {
    o.totalAmount = {
      value: Number(String(totalVal).replace(/,/g, '')),
      currency: String(totalCur ?? 'USD').toUpperCase(),
    }
  }

  const taxInr = o.taxableValueInr ?? o.taxableInr
  if (taxInr !== undefined && taxInr !== '') {
    o.taxableValue = { inr: Number(String(taxInr).replace(/,/g, '')) }
  }

  if (typeof o.igstAmount === 'string') {
    o.igstAmount = Number(String(o.igstAmount).replace(/,/g, ''))
  }

  return o
}

export function parseInvoiceFromCSV(csvString: string): ParsedInvoice[] {
  const lines = csvString.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []

  const header = parseCsvLine(lines[0])
  const results: ParsedInvoice[] = []

  if (header.length === 1 && header[0].toLowerCase() === 'json') {
    for (let i = 1; i < lines.length; i++) {
      try {
        const raw = JSON.parse(lines[i]) as unknown
        const r = parseInvoice(raw)
        if (!isInvoiceParseError(r)) results.push(r)
        else
          console.warn(
            `[invoiceParser] Skipping JSON CSV row ${i + 1}:`,
            r.error,
          )
      } catch (e) {
        console.warn(`[invoiceParser] Skipping malformed JSON row ${i + 1}`, e)
      }
    }
    return results
  }

  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCsvLine(lines[i])
      if (row.every((c) => c === '')) continue
      const obj = rowToInvoiceRecord(header, row)
      const r = parseInvoice(obj)
      if (!isInvoiceParseError(r)) results.push(r)
      else
        console.warn(`[invoiceParser] Skipping invalid CSV row ${i + 1}:`, r.error)
    } catch (e) {
      console.warn(`[invoiceParser] Skipping malformed CSV row ${i + 1}`, e)
    }
  }

  return results
}
