import type {
  ApprovedMatch,
  FiraRecord,
  InvoiceRecord,
  Rfd01Statement3BRow,
  Statement3B,
  StatementJSON,
  SummaryReport,
} from '../types/index.js'

const GSTIN_RE =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

const BRC_RE = /^[A-Za-z0-9][A-Za-z0-9/_-]{3,}$/

/** Official Statement 3B column titles for GST offline utility (14 columns). */
export const STATEMENT_3B_HEADERS_OFFICIAL = [
  'GSTIN of Supplier',
  'Invoice No.',
  'Invoice Date',
  'Invoice Value (in INR)',
  'Taxable Value (in INR)',
  'Integrated Tax',
  'Central Tax',
  'State/UT Tax',
  'Cess',
  'BRC/FIRC No.',
  'BRC/FIRC Date',
  'Port Code',
  'Shipping Bill No.',
  'Shipping Bill Date',
] as const

export function validateGSTIN(gstin: string): boolean {
  const s = gstin.trim().toUpperCase()
  return s.length === 15 && GSTIN_RE.test(s)
}

export function validateBRCNumber(ref: string): boolean {
  const s = ref.trim()
  if (s.length < 4) return false
  return BRC_RE.test(s)
}

export function calculateTaxableValue(
  amountForeign: number,
  inrPerUnit: number,
): number {
  return Math.round(amountForeign * inrPerUnit * 100) / 100
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function parseDateParts(isoOrDdMmYyyy: string): { d: string; m: string; y: string } | null {
  const s = isoOrDdMmYyyy.trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (iso) {
    return { y: iso[1]!, m: iso[2]!, d: iso[3]! }
  }
  const dmy = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(s)
  if (dmy) {
    return { d: dmy[1]!, m: dmy[2]!, y: dmy[3]! }
  }
  return null
}

/** DD-MM-YYYY for row objects / legacy CSV */
export function formatDateDdMmYyyyDash(raw: string): string {
  const p = parseDateParts(raw)
  if (!p) throw new Error(`Invalid date: ${raw}`)
  return `${p.d}-${p.m}-${p.y}`
}

/** DD/MM/YYYY for GST CSV import */
export function formatDateDdMmYyyySlash(raw: string): string {
  const p = parseDateParts(raw)
  if (!p) throw new Error(`Invalid date: ${raw}`)
  return `${p.d}/${p.m}/${p.y}`
}

export function resolveAmountsInInr(match: ApprovedMatch): {
  invoiceValue: number
  taxableValue: number
  integratedTax: number
} {
  const { invoice, inrPerForeignUnit } = match
  const foreign = invoice.amountOriginal

  if (
    inrPerForeignUnit != null &&
    foreign != null &&
    Number.isFinite(foreign) &&
    foreign > 0 &&
    invoice.invoiceValue > 0
  ) {
    const convertedTotal = calculateTaxableValue(foreign, inrPerForeignUnit)
    const scale = convertedTotal / invoice.invoiceValue
    return {
      invoiceValue: round2(convertedTotal),
      taxableValue: round2(invoice.taxableValue * scale),
      integratedTax: round2(invoice.integratedTax * scale),
    }
  }

  return {
    invoiceValue: round2(invoice.invoiceValue),
    taxableValue: round2(invoice.taxableValue),
    integratedTax: round2(invoice.integratedTax),
  }
}

function assertRequired(
  label: string,
  value: string | number | null | undefined,
): void {
  if (value === null || value === undefined) {
    throw new Error(`RFD-01 Statement 3B: missing ${label}`)
  }
  if (typeof value === 'string' && !value.trim()) {
    throw new Error(`RFD-01 Statement 3B: missing ${label}`)
  }
}

export function generateStatement3BRow(match: ApprovedMatch): Rfd01Statement3BRow {
  const { fira, invoice } = match

  assertRequired('GSTIN of supplier', invoice.supplierGstin)
  assertRequired('Invoice No.', invoice.invoiceNo)
  assertRequired('Invoice date', invoice.invoiceDate)
  assertRequired('FIRA reference (BRC/FIRC)', fira.referenceNo)
  assertRequired('FIRA value date', fira.valueDate)

  if (!validateGSTIN(invoice.supplierGstin)) {
    throw new Error('Invalid supplier GSTIN')
  }

  const amounts = resolveAmountsInInr(match)
  const brc = fira.referenceNo.trim()
  const missingBrc = !validateBRCNumber(brc)

  const invoiceDateDash = formatDateDdMmYyyyDash(invoice.invoiceDate)
  const brcDateDash = formatDateDdMmYyyyDash(fira.valueDate)

  return {
    gstinOfSupplier: invoice.supplierGstin.trim().toUpperCase(),
    invoiceNo: invoice.invoiceNo.trim(),
    invoiceDate: invoiceDateDash,
    invoiceValue: amounts.invoiceValue,
    taxableValue: amounts.taxableValue,
    integratedTax: amounts.integratedTax,
    centralTax: 0,
    stateUtTax: 0,
    cess: 0,
    brcFircNo: brc,
    brcFircDate: brcDateDash,
    portCode: '',
    shippingBillNo: 'N/A',
    shippingBillDate: 'N/A',
    missingBrcFlag: missingBrc,
  }
}

export function generateFullStatement(
  approvedMatches: ApprovedMatch[],
): Statement3B {
  const rows = approvedMatches.map((m) => generateStatement3BRow(m))
  const expectedTaxableTotal = round2(
    approvedMatches.reduce((s, m) => s + resolveAmountsInInr(m).taxableValue, 0),
  )
  const totalTaxableValue = round2(
    rows.reduce((s, r) => s + r.taxableValue, 0),
  )
  const taxableTotalConsistent =
    Math.abs(totalTaxableValue - expectedTaxableTotal) <= 0.02

  const validationWarnings: Statement3B['validationWarnings'] = []

  if (!taxableTotalConsistent) {
    validationWarnings.push({
      rowIndex: -1,
      code: 'TAXABLE_TOTAL_DRIFT',
      message: `Row taxable sum ${totalTaxableValue} differs from resolved expected ${expectedTaxableTotal}`,
    })
  }

  rows.forEach((row, rowIndex) => {
    if (row.missingBrcFlag || !validateBRCNumber(row.brcFircNo)) {
      validationWarnings.push({
        rowIndex,
        code: 'MISSING_OR_INVALID_BRC',
        message: `BRC/FIRC reference missing or invalid for invoice ${row.invoiceNo}`,
      })
    }
  })

  const lutNumbersUsed = [
    ...new Set(
      approvedMatches
        .map((m) => m.lutNumber?.trim())
        .filter((x): x is string => Boolean(x)),
    ),
  ]

  const summary: Statement3B['summary'] = {
    totalInvoiceValue: round2(rows.reduce((s, r) => s + r.invoiceValue, 0)),
    totalTaxableValue,
    totalIntegratedTax: round2(rows.reduce((s, r) => s + r.integratedTax, 0)),
    totalCentralTax: 0,
    totalStateUtTax: 0,
    totalCess: 0,
    rowCount: rows.length,
    sourceTaxableTotal: expectedTaxableTotal,
    taxableTotalConsistent,
    lutNumbersUsed,
  }

  return { rows, summary, validationWarnings }
}

function csvEscapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function fmtAmount(n: number): string {
  return n.toFixed(2)
}

/** Full 14-column CSV for GST offline utility: DD/MM/YYYY, 2 d.p., no symbols. */
export function exportToCSV(statement: Statement3B): string {
  const lines: string[] = []
  lines.push([...STATEMENT_3B_HEADERS_OFFICIAL].join(','))

  for (const row of statement.rows) {
    const cells = [
      csvEscapeCell(row.gstinOfSupplier),
      csvEscapeCell(row.invoiceNo),
      csvEscapeCell(formatDateDdMmYyyySlash(rowDateToIso(row.invoiceDate))),
      fmtAmount(row.invoiceValue),
      fmtAmount(row.taxableValue),
      fmtAmount(row.integratedTax),
      fmtAmount(row.centralTax),
      fmtAmount(row.stateUtTax),
      fmtAmount(row.cess),
      csvEscapeCell(row.brcFircNo),
      csvEscapeCell(formatDateDdMmYyyySlash(rowDateToIso(row.brcFircDate))),
      csvEscapeCell(row.portCode),
      csvEscapeCell(row.shippingBillNo),
      csvEscapeCell(row.shippingBillDate),
    ]
    lines.push(cells.join(','))
  }

  return lines.join('\r\n')
}

/** Row stores DD-MM-YYYY; normalise to ISO for slash formatter. */
function rowDateToIso(ddMmYyyyDash: string): string {
  const normalized = ddMmYyyyDash.replace(/-/g, '/')
  const p = parseDateParts(normalized)
  if (!p) return ddMmYyyyDash
  return `${p.y}-${p.m}-${p.d}`
}

export function exportToJSON(statement: Statement3B): StatementJSON {
  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    statement,
  }
}

function minIso(a: string, b: string): string {
  return a < b ? a : b
}

function maxIso(a: string, b: string): string {
  return a > b ? a : b
}

function rowToIsoSortKey(ddMmYyyyDash: string): string {
  const p = parseDateParts(ddMmYyyyDash.replace(/-/g, '/'))
  if (!p) return ddMmYyyyDash
  return `${p.y}-${p.m}-${p.d}`
}

export function generateSummaryReport(statement: Statement3B): SummaryReport {
  const gstins = new Set(
    statement.rows.map((r) => r.gstinOfSupplier).filter(Boolean),
  )
  const exporterGstin = [...gstins][0] ?? ''

  let periodFrom = ''
  let periodTo = ''
  for (const row of statement.rows) {
    const k = rowToIsoSortKey(row.invoiceDate)
    periodFrom = periodFrom ? minIso(periodFrom, k) : k
    periodTo = periodTo ? maxIso(periodTo, k) : k
  }

  const periodFromDisplay = periodFrom
    ? formatDateDdMmYyyySlash(periodFrom)
    : ''
  const periodToDisplay = periodTo ? formatDateDdMmYyyySlash(periodTo) : ''

  return {
    transactionCount: statement.summary.rowCount,
    totalTaxableValueInr: statement.summary.totalTaxableValue,
    totalEligibleRefundEstimateInr: round2(
      statement.summary.totalTaxableValue * 0.18,
    ),
    periodFrom: periodFromDisplay,
    periodTo: periodToDisplay,
    exporterGstin,
    lutNumbersUsed: statement.summary.lutNumbersUsed ?? [],
  }
}

/** Convenience: row from separate FIRA + invoice (tests). */
export function generateStatement3BRowFromPair(
  fira: FiraRecord,
  invoice: InvoiceRecord,
): Rfd01Statement3BRow {
  return generateStatement3BRow({ fira, invoice })
}
