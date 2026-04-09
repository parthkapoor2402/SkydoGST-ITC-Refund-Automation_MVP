import type { FiraRecord, InvoiceRecord } from '../types'
import type { ParsedFIRA, ParsedInvoice } from '../types/parser'

export function mapParsedFiraToRecord(
  id: string,
  sourceFileName: string,
  p: ParsedFIRA,
): FiraRecord {
  return {
    id,
    sourceFileName,
    amountInr: p.creditedAmountInr.value,
    valueDate: p.valueDateIso,
    remitterNameRaw: p.remitterName,
    referenceNo: p.referenceNumber,
    parseConfidence: 0.95,
    currencyOriginal: p.amountForeign.currency,
    amountOriginal: p.amountForeign.value,
  }
}

export function mapParsedInvoiceToRecord(
  id: string,
  sourceFileName: string,
  p: ParsedInvoice,
): InvoiceRecord {
  const invoiceValue = p.taxableValueInr + p.igstAmount
  return {
    id,
    sourceFileName,
    supplierGstin: p.exporterGSTIN,
    invoiceNo: p.invoiceNumber,
    invoiceDate: p.invoiceDate,
    invoiceValue,
    taxableValue: p.taxableValueInr,
    integratedTax: p.igstAmount,
    clientNameRaw: p.client.name,
    parseConfidence: 0.9,
    currency: p.totalAmount.currency,
    amountOriginal: p.totalAmount.value,
  }
}
