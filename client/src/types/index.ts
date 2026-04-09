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

/** Full Statement 3B row (14 columns) aligned with GST offline utility */
export interface Rfd01Statement3BRow {
  gstinOfSupplier: string
  invoiceNo: string
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
  missingBrcFlag?: boolean
}

export type MatchAuditMethod = 'Exact' | 'Fuzzy' | 'AI' | 'Manual'

export interface ApprovedMatchPayload {
  fira: FiraRecord
  invoice: InvoiceRecord
  inrPerForeignUnit?: number
  lutNumber?: string | null
  matchMethod?: MatchAuditMethod
  matchConfidence?: string
  approvedBy?: string
  approvedAt?: string
}

export interface EngineMatchResultUI {
  tier: number
  status: string
  confidence: string
  firaReferenceNumber: string
  matchedInvoiceNumber: string | null
  matchedInvoiceIndex: number | null
  candidates?: Array<{ invoiceIndex: number; invoiceNumber: string }>
  reviewFlag?: boolean
  reason?: string
  grok?: {
    matchedInvoiceId: string | null
    confidence: string
    reasoning: string
  }
}

export interface MatchResultRowUI {
  id: string
  match: EngineMatchResultUI
  decision: 'pending' | 'approved' | 'rejected' | 'overridden'
  overrideInvoiceNumber?: string | null
  updatedAt: string
}

export interface Rfd01Statement3BExport {
  rows: Rfd01Statement3BRow[]
  validationWarnings: Array<{
    rowIndex: number
    code: string
    message: string
  }>
}
