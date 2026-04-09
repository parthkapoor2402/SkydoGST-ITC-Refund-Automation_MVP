import { apiUrl } from './apiBase'
import type { ApprovedMatchPayload } from '../types'
import type { ParsedFIRA, ParsedInvoice } from '../types/parser'

export const queryKeys = {
  firas: ['fira', 'list'] as const,
  invoices: ['invoice', 'list'] as const,
  matchRows: ['match', 'rows'] as const,
  reportPreview: ['report', 'preview'] as const,
}

async function readError(res: Response): Promise<string> {
  const t = await res.text()
  try {
    const j = JSON.parse(t) as { error?: string }
    return j.error ?? (t || res.statusText)
  } catch {
    return t || res.statusText
  }
}

export async function fetchFiraList(): Promise<
  Array<{ id: string; sourceFileName: string; parsed: ParsedFIRA }>
> {
  const res = await fetch(apiUrl('/api/fira/list'))
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as {
    items: Array<{ id: string; sourceFileName: string; parsed: ParsedFIRA }>
  }
  return data.items ?? []
}

export async function fetchInvoiceList(): Promise<
  Array<{ id: string; sourceFileName: string; parsed: ParsedInvoice }>
> {
  const res = await fetch(apiUrl('/api/invoices/list'))
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as {
    items: Array<{ id: string; sourceFileName: string; parsed: ParsedInvoice }>
  }
  return data.items ?? []
}

export async function uploadFiraJsonFiles(
  files: File[],
): Promise<{ saved: unknown[]; errors: { file: string; error: string }[] }> {
  const fd = new FormData()
  for (const f of files) fd.append('files', f)
  const res = await fetch(apiUrl('/api/fira/upload'), { method: 'POST', body: fd })
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as {
    saved: unknown[]
    errors: { file: string; error: string }[]
  }
}

export async function uploadInvoiceJsonFiles(
  files: File[],
): Promise<{ saved: unknown[]; errors: { file: string; error: string }[] }> {
  const fd = new FormData()
  for (const f of files) fd.append('files', f)
  const res = await fetch(apiUrl('/api/invoices/upload'), {
    method: 'POST',
    body: fd,
  })
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as {
    saved: unknown[]
    errors: { file: string; error: string }[]
  }
}

export async function parseFiraCsv(csv: string): Promise<{ count: number }> {
  const res = await fetch(apiUrl('/api/fira/parse-csv'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv }),
  })
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as { count: number }
}

export async function parseInvoiceCsv(csv: string): Promise<{ count: number }> {
  const res = await fetch(apiUrl('/api/invoices/parse-csv'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv }),
  })
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as { count: number }
}

export interface BatchMatchResponse {
  results: Array<Record<string, unknown>>
  summary: Record<string, number>
  rowIds: string[]
}

export async function postMatchRun(body?: {
  firas?: ParsedFIRA[]
  invoices?: ParsedInvoice[]
}): Promise<BatchMatchResponse> {
  const res = await fetch(apiUrl('/api/match/run'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as BatchMatchResponse
}

export async function fetchMatchRows(): Promise<
  Array<{
    id: string
    match: Record<string, unknown>
    decision: string
    overrideInvoiceNumber?: string | null
    updatedAt: string
  }>
> {
  const res = await fetch(apiUrl('/api/match/results'))
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as {
    items: Array<{
      id: string
      match: Record<string, unknown>
      decision: string
      overrideInvoiceNumber?: string | null
      updatedAt: string
    }>
  }
  return data.items ?? []
}

export async function approveMatchRow(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/match/${encodeURIComponent(id)}/approve`), {
    method: 'PUT',
  })
  if (!res.ok) throw new Error(await readError(res))
}

export async function rejectMatchRow(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/match/${encodeURIComponent(id)}/reject`), {
    method: 'PUT',
  })
  if (!res.ok) throw new Error(await readError(res))
}

export async function overrideMatchRow(
  id: string,
  invoiceNumber: string,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/match/${encodeURIComponent(id)}/override`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceNumber }),
  })
  if (!res.ok) throw new Error(await readError(res))
}

export async function postReportGenerate(
  approvedMatches: ApprovedMatchPayload[],
): Promise<unknown> {
  const res = await fetch(apiUrl('/api/report/generate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedMatches }),
  })
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}

export async function fetchReportPreview(): Promise<unknown> {
  const res = await fetch(apiUrl('/api/report/preview'))
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}

export async function postSessionReset(): Promise<void> {
  const res = await fetch(apiUrl('/api/session/reset'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) throw new Error(await readError(res))
}
