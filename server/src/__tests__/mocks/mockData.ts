import type { FiraRecord, InvoiceRecord } from '../../types/index'

export interface MockFiraJson {
  id: string
  referenceLabel: string
  rawText: string
  json: Record<string, unknown>
  expectedCurrency: 'USD' | 'GBP' | 'EUR'
  expectedAmountOriginal: number
  expectedRemitter: string
  expectedUtr: string
  expectedDateIso: string
}

export const mockFiraJsonUsd1: MockFiraJson = {
  id: 'fira-usd-1',
  referenceLabel: 'HDFC FIRA sample',
  rawText:
    'Foreign Inward Remittance Advice\nRemitter: Acme Corp USA\nAmount: USD 12,450.00\nValue Date: 15/03/2025\nUTR: HDFC0009988776655\nPurpose: Export proceeds',
  json: {
    remitterName: 'Acme Corp USA',
    amount: { currency: 'USD', value: 12450.0 },
    valueDate: '15/03/2025',
    utr: 'HDFC0009988776655',
  },
  expectedCurrency: 'USD',
  expectedAmountOriginal: 12450,
  expectedRemitter: 'Acme Corp USA',
  expectedUtr: 'HDFC0009988776655',
  expectedDateIso: '2025-03-15',
}

export const mockFiraJsonGbp1: MockFiraJson = {
  id: 'fira-gbp-1',
  referenceLabel: 'Barclays credit advice',
  rawText:
    'Payment received\nBeneficiary narrative: EU CLIENT LTD\nGBP 8,200.50 credited on 03-25-2025\nRef: UKREF556644332211',
  json: {
    remitter: 'EU CLIENT LTD',
    amountOriginal: '£8,200.50',
    creditDate: '03-25-2025',
    reference: 'UKREF556644332211',
  },
  expectedCurrency: 'GBP',
  expectedAmountOriginal: 8200.5,
  expectedRemitter: 'EU CLIENT LTD',
  expectedUtr: 'UKREF556644332211',
  expectedDateIso: '2025-03-25',
}

export const mockFiraJsonEur1: MockFiraJson = {
  id: 'fira-eur-1',
  referenceLabel: 'Deutsche Bank advice',
  rawText:
    'Gutschrift EUR 22.345,67\nAbsender: Müller Engineering GmbH\nDatum 28.12.2024\nVerwendungszweck EREF DEUTDEFF5088',
  json: {
    sender: 'Müller Engineering GmbH',
    amountEur: '22345,67',
    bookingDate: '28.12.2024',
    endToEndId: 'DEUTDEFF5088',
  },
  expectedCurrency: 'EUR',
  expectedAmountOriginal: 22345.67,
  expectedRemitter: 'Müller Engineering GmbH',
  expectedUtr: 'DEUTDEFF5088',
  expectedDateIso: '2024-12-28',
}

export const mockFiraMalformed = {
  id: 'fira-malformed',
  raw: '%%% not a fira %%% {{{',
  json: { broken: true, nested: { a: null } },
}

export const mockFiraMissingFields = {
  id: 'fira-partial',
  json: {
    amount: { currency: 'USD' },
  },
}

export const mockFiras: MockFiraJson[] = [
  mockFiraJsonUsd1,
  mockFiraJsonGbp1,
  mockFiraJsonEur1,
]

export interface MockInvoiceFixture {
  id: string
  invoiceNumberRaw: string
  invoiceNumberNormalized: string
  amountRaw: string
  amountValue: number
  currency: string
  gstin: string
  lut: string
  clientLine: string
  clientName: string
  clientCountry: string
}

export const mockInvoiceInv001: MockInvoiceFixture = {
  id: 'inv-1',
  invoiceNumberRaw: 'INV-001',
  invoiceNumberNormalized: 'INV-001',
  amountRaw: '$10,000.00',
  amountValue: 10000,
  currency: 'USD',
  gstin: '27AABCU9603R1ZX',
  lut: 'AD27032500001234',
  clientLine: 'Bill To: ACME CORPORATION · United States',
  clientName: 'ACME CORPORATION',
  clientCountry: 'United States',
}

export const mockInvoiceInvPlain: MockInvoiceFixture = {
  id: 'inv-2',
  invoiceNumberRaw: 'INV001',
  invoiceNumberNormalized: 'INV001',
  amountRaw: 'GBP 5,000',
  amountValue: 5000,
  currency: 'GBP',
  gstin: '29ABCDE1234F1Z5',
  lut: 'LUT applied: AD27032500999999',
  clientName: 'Beta Ltd',
  clientCountry: 'United Kingdom',
  clientLine: 'Overseas customer: Beta Ltd (UK)',
}

export const mockInvoiceYearFmt: MockInvoiceFixture = {
  id: 'inv-3',
  invoiceNumberRaw: '2024-001',
  invoiceNumberNormalized: '2024-001',
  amountRaw: '€12.345,67',
  amountValue: 12345.67,
  currency: 'EUR',
  gstin: '24AABCT1332Q1ZV',
  lut: '',
  clientLine: 'Client: Gamma SA / France',
  clientName: 'Gamma SA',
  clientCountry: 'France',
}

export const mockInvoiceDupA: MockInvoiceFixture = {
  id: 'inv-dup-a',
  invoiceNumberRaw: 'DUP-100',
  invoiceNumberNormalized: 'DUP-100',
  amountRaw: 'USD 1,000',
  amountValue: 1000,
  currency: 'USD',
  gstin: '27AABCU9603R1ZX',
  lut: '',
  clientLine: 'Client: DupCo',
  clientName: 'DupCo',
  clientCountry: 'US',
}

export const mockInvoiceDupB: MockInvoiceFixture = {
  id: 'inv-dup-b',
  invoiceNumberRaw: 'dup-100',
  invoiceNumberNormalized: 'DUP-100',
  amountRaw: 'USD 2,000',
  amountValue: 2000,
  currency: 'USD',
  gstin: '27AABCU9603R1ZX',
  lut: '',
  clientLine: 'Client: DupCo Two',
  clientName: 'DupCo Two',
  clientCountry: 'US',
}

export const mockInvoices: MockInvoiceFixture[] = [
  mockInvoiceInv001,
  mockInvoiceInvPlain,
  mockInvoiceYearFmt,
  mockInvoiceDupA,
  mockInvoiceDupB,
]

export interface GoldenMatchedPair {
  fira: FiraRecord
  invoice: InvoiceRecord
  expectedConfidenceBand: 'high' | 'medium'
}

export const goldenMatchedPairs: GoldenMatchedPair[] = [
  {
    fira: {
      id: 'gf-1',
      sourceFileName: 'f1.pdf',
      amountInr: 1_035_000,
      valueDate: '2025-03-15',
      remitterNameRaw: 'Acme Corp',
      referenceNo: 'UTR111',
      parseConfidence: 0.95,
    },
    invoice: {
      id: 'gi-1',
      sourceFileName: 'i1.csv',
      supplierGstin: '27AABCU9603R1ZX',
      invoiceNo: 'INV-ACME-1',
      invoiceDate: '2025-03-14',
      invoiceValue: 1_035_000,
      taxableValue: 877_119,
      integratedTax: 157_881,
      clientNameRaw: 'Acme Corp',
      parseConfidence: 0.92,
    },
    expectedConfidenceBand: 'high',
  },
  {
    fira: {
      id: 'gf-2',
      sourceFileName: 'f2.pdf',
      amountInr: 500_000,
      valueDate: '2025-02-01',
      remitterNameRaw: 'Beta Trading LLC',
      referenceNo: 'UTR222',
      parseConfidence: 0.9,
    },
    invoice: {
      id: 'gi-2',
      sourceFileName: 'i2.csv',
      supplierGstin: '27AABCU9603R1ZX',
      invoiceNo: 'INV-BETA-2',
      invoiceDate: '2025-02-03',
      invoiceValue: 505_000,
      taxableValue: 427_966,
      integratedTax: 77_034,
      clientNameRaw: 'Beta Trading LLC',
      parseConfidence: 0.88,
    },
    expectedConfidenceBand: 'medium',
  },
  {
    fira: {
      id: 'gf-3',
      sourceFileName: 'f3.pdf',
      amountInr: 250_000,
      valueDate: '2025-01-20',
      remitterNameRaw: 'Gamma Exports',
      referenceNo: 'FIRC88332211',
      parseConfidence: 0.93,
    },
    invoice: {
      id: 'gi-3',
      sourceFileName: 'i3.csv',
      supplierGstin: '27AABCU9603R1ZX',
      invoiceNo: '2025-044',
      invoiceDate: '2025-01-18',
      invoiceValue: 250_000,
      taxableValue: 211_864,
      integratedTax: 38_136,
      clientNameRaw: 'Gamma Exports Pte Ltd',
      parseConfidence: 0.9,
    },
    expectedConfidenceBand: 'high',
  },
]

export const intentionallyUnmatched = {
  firaNoInvoice: {
    fira: {
      id: 'um-f-1',
      sourceFileName: 'orphan.pdf',
      amountInr: 99_999,
      valueDate: '2024-06-01',
      remitterNameRaw: 'Unknown Payer',
      referenceNo: 'UTR-ORPHAN',
      parseConfidence: 0.7,
    } satisfies FiraRecord,
    reason: 'NO_INVOICE_CANDIDATE',
  },
  invoiceNoFira: {
    invoice: {
      id: 'um-i-1',
      sourceFileName: 'lonely.csv',
      supplierGstin: '27AABCU9603R1ZX',
      invoiceNo: 'INV-LONELY',
      invoiceDate: '2024-06-15',
      invoiceValue: 50_000,
      taxableValue: 42_373,
      integratedTax: 7_627,
      clientNameRaw: 'No remittance client',
      parseConfidence: 0.85,
    } satisfies InvoiceRecord,
    reason: 'NO_FIRA_CANDIDATE',
  },
} as const
