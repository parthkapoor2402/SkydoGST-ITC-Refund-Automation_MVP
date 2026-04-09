import type {
  ApprovedMatch,
  FiraRecord,
  InvoiceRecord,
  Rfd01Statement3BRow,
} from '../types/index.js'
import {
  calculateTaxableValue,
  exportToCSV as exportStatementToCSV,
  exportToJSON,
  formatDateDdMmYyyyDash,
  generateFullStatement as generateFullStatementModule,
  generateStatement3BRowFromPair,
  generateSummaryReport as generateSummaryReportModule,
  validateBRCNumber,
  validateGSTIN,
} from '../modules/rfd01Generator.js'

export type { Statement3B, StatementJSON, SummaryReport } from '../types/index.js'

export {
  exportToCSV,
  exportToJSON,
  generateFullStatement as generateFullStatementFromApproved,
  generateStatement3BRow as generateStatement3BRowFromApproved,
  generateSummaryReport,
  STATEMENT_3B_HEADERS_OFFICIAL,
} from '../modules/rfd01Generator.js'

/** Legacy 8-column header order used by older GST templates + unit tests. */
export const STATEMENT_3B_HEADERS = [
  'GSTIN of supplier',
  'Invoice No.',
  'Invoice Date',
  'Invoice Value',
  'Taxable Value',
  'Integrated Tax',
  'BRC/FIRC No.',
  'BRC/FIRC Date',
] as const

export function generateStatement3BRow(
  fira: FiraRecord,
  invoice: InvoiceRecord,
): Rfd01Statement3BRow {
  return generateStatement3BRowFromPair(fira, invoice)
}

export function generateFullStatement(
  pairs: Array<{ fira: FiraRecord; invoice: InvoiceRecord }>,
): Rfd01Statement3BRow[] {
  const approved: ApprovedMatch[] = pairs.map((p) => ({
    fira: p.fira,
    invoice: p.invoice,
  }))
  return generateFullStatementModule(approved).rows
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

/** 8-column CSV matching STATEMENT_3B_HEADERS (Vitest contract). */
export function outputCSVFormat(rows: Rfd01Statement3BRow[]): string {
  const lines: string[] = []
  lines.push([...STATEMENT_3B_HEADERS].join(','))
  for (const row of rows) {
    const cells = [
      csvEscapeCell(row.gstinOfSupplier),
      csvEscapeCell(row.invoiceNo),
      csvEscapeCell(row.invoiceDate),
      fmtAmount(row.invoiceValue),
      fmtAmount(row.taxableValue),
      fmtAmount(row.integratedTax),
      csvEscapeCell(row.brcFircNo),
      csvEscapeCell(row.brcFircDate),
    ]
    lines.push(cells.join(','))
  }
  return lines.join('\r\n')
}

export {
  calculateTaxableValue,
  formatDateDdMmYyyyDash,
  validateBRCNumber,
  validateGSTIN,
}

/** Full pipeline: approved matches → Statement3B (14-col export + validation). */
export function buildStatement3B(approvedMatches: ApprovedMatch[]) {
  return generateFullStatementModule(approvedMatches)
}

export function buildStatementJson(approvedMatches: ApprovedMatch[]) {
  return exportToJSON(generateFullStatementModule(approvedMatches))
}

export function buildStatementCsv(approvedMatches: ApprovedMatch[]) {
  return exportStatementToCSV(generateFullStatementModule(approvedMatches))
}

export function buildSummaryReport(approvedMatches: ApprovedMatch[]) {
  return generateSummaryReportModule(
    generateFullStatementModule(approvedMatches),
  )
}
