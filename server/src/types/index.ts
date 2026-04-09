export interface FiraRecord {
  id: string
  sourceFileName: string
  amountInr: number
  valueDate: string
  remitterNameRaw: string
  remitterNameNormalized?: string
  referenceNo: string
  narration?: string
  currencyOriginal?: string
  amountOriginal?: number
  parseConfidence: number
  rawExcerpt?: string
}

export interface InvoiceRecord {
  id: string
  sourceFileName: string
  supplierGstin: string
  invoiceNo: string
  invoiceDate: string
  invoiceValue: number
  taxableValue: number
  integratedTax: number
  clientNameRaw: string
  clientNameNormalized?: string
  currency?: string
  /** Foreign invoice total when converting with ApprovedMatch.inrPerForeignUnit */
  amountOriginal?: number
  parseConfidence: number
  rawExcerpt?: string
}

export type MatchStatus =
  | 'auto_accepted'
  | 'auto_suggested'
  | 'manual'
  | 'unmatched'

export interface MatchResult {
  id: string
  firaId: string
  invoiceId: string | null
  status: MatchStatus
  confidence: number
  scoreBreakdown: {
    amount: number
    dateProximity: number
    nameSimilarity: number
  }
  grok?: {
    used: boolean
    rationale?: string
    normalizedRemitter?: string
    normalizedClient?: string
  }
  userOverridden?: boolean
}

export type MatchAuditMethod = 'Exact' | 'Fuzzy' | 'AI' | 'Manual'

/** Approved FIRA ↔ invoice pair for RFD-01 export */
export interface ApprovedMatch {
  fira: FiraRecord
  invoice: InvoiceRecord
  /** INR per 1 unit of foreign currency (e.g. USD); optional when amounts are already INR */
  inrPerForeignUnit?: number
  lutNumber?: string | null
  /** Populated for CA bundle audit CSV (defaults applied if omitted) */
  matchMethod?: MatchAuditMethod
  matchConfidence?: string
  approvedBy?: string
  /** ISO 8601 */
  approvedAt?: string
}

export interface Rfd01Statement3BRow {
  gstinOfSupplier: string
  invoiceNo: string
  /** DD-MM-YYYY (internal / JSON); CSV export uses DD/MM/YYYY */
  invoiceDate: string
  invoiceValue: number
  taxableValue: number
  integratedTax: number
  centralTax: number
  stateUtTax: number
  cess: number
  brcFircNo: string
  brcFircDate: string
  portCode: string
  shippingBillNo: string
  shippingBillDate: string
  /** Set when BRC/FIRC reference is missing or invalid */
  missingBrcFlag?: boolean
}

export interface Statement3BSummary {
  totalInvoiceValue: number
  totalTaxableValue: number
  totalIntegratedTax: number
  totalCentralTax: number
  totalStateUtTax: number
  totalCess: number
  rowCount: number
  /** Sum of invoice.taxableValue from source pairs; flags drift vs row totals */
  sourceTaxableTotal?: number
  taxableTotalConsistent: boolean
  lutNumbersUsed?: string[]
}

export interface Statement3B {
  rows: Rfd01Statement3BRow[]
  summary: Statement3BSummary
  validationWarnings: Array<{
    rowIndex: number
    code: string
    message: string
  }>
}

export interface StatementJSON {
  version: string
  generatedAt: string
  statement: Statement3B
}

export interface SummaryReport {
  transactionCount: number
  totalTaxableValueInr: number
  /**
   * Placeholder when input ITC registers are not loaded: 18% of total taxable
   * as a rough ITC proxy (not export tax).
   */
  totalEligibleRefundEstimateInr: number
  periodFrom: string
  periodTo: string
  exporterGstin: string
  lutNumbersUsed: string[]
}

export interface Rfd01Statement3BExport {
  rows: Rfd01Statement3BRow[]
  validationWarnings: Array<{
    rowIndex: number
    code: string
    message: string
  }>
}
