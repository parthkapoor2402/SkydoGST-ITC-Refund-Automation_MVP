/** Mirrors server ParsedFIRA for API mapping */
export interface ParsedFIRA {
  documentType: 'FIRA'
  referenceNumber: string
  remitterName: string
  remitterCountry: string | null
  remitterBank: string | null
  amountForeign: { value: number; currency: string }
  creditedAmountInr: { value: number; currency: 'INR' }
  exchangeRate: number | null
  valueDateIso: string
  purposeCode: string | null
  beneficiaryGSTIN: string | null
}

export interface ParsedInvoice {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string | null
  exporterGSTIN: string
  client: { name: string; country: string; address: string | null }
  taxableValueInr: number
  igstAmount: number
  totalAmount: { value: number; currency: string }
  paymentReference?: string | null
}

export interface StoredFiraItem {
  id: string
  sourceFileName: string
  parsed: ParsedFIRA
}

export interface StoredInvoiceItem {
  id: string
  sourceFileName: string
  parsed: ParsedInvoice
}
