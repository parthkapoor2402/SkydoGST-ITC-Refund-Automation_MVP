import type { ParsedInvoice } from '../modules/invoiceParser.js'

export interface StoredInvoice {
  id: string
  parsed: ParsedInvoice
  sourceFileName?: string
}

const invoiceById = new Map<string, StoredInvoice>()

export function storeInvoice(entry: StoredInvoice): void {
  invoiceById.set(entry.id, entry)
}

export function getInvoice(id: string): StoredInvoice | undefined {
  return invoiceById.get(id)
}

export function listInvoices(): StoredInvoice[] {
  return Array.from(invoiceById.values())
}

export function deleteInvoice(id: string): boolean {
  return invoiceById.delete(id)
}

/** Remove any stored invoice with this invoice number. Latest upload wins. */
export function deleteInvoiceByInvoiceNumber(invoiceNumber: string): void {
  const toRemove: string[] = []
  for (const [id, s] of invoiceById) {
    if (s.parsed.invoiceNumber === invoiceNumber) {
      toRemove.push(id)
    }
  }
  for (const id of toRemove) {
    invoiceById.delete(id)
  }
}

export function clearAllInvoices(): void {
  invoiceById.clear()
}
