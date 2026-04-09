/** Optional original PDF bytes aligned by index with approved matches (upload pipeline). */
let firaPdfBuffers: Buffer[] = []
let invoicePdfBuffers: Buffer[] = []

export function setBundlePdfBuffers(
  fira: Buffer[],
  invoices: Buffer[],
): void {
  firaPdfBuffers = [...fira]
  invoicePdfBuffers = [...invoices]
}

export function getBundleFiraPdfBuffers(): Buffer[] {
  return firaPdfBuffers
}

export function getBundleInvoicePdfBuffers(): Buffer[] {
  return invoicePdfBuffers
}

export function clearBundlePdfBuffers(): void {
  firaPdfBuffers = []
  invoicePdfBuffers = []
}
