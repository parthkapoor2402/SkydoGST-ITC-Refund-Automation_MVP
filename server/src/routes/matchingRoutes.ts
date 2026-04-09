import { randomUUID } from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import { grokOpenAI } from '../lib/grokClient.js'
import { runBatchMatching } from '../modules/matchingEngine.js'
import { listFiras } from '../services/firaSessionStore.js'
import { listInvoices } from '../services/invoiceSessionStore.js'
import {
  approveMatchRow,
  getMatchRow,
  listMatchRows,
  overrideMatchRow,
  rejectMatchRow,
  setMatchRun,
} from '../services/matchingSessionStore.js'

export const matchingRouter = Router()

matchingRouter.post('/run', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      firas?: unknown
      invoices?: unknown
    } | null

    const fromBodyFiras = Array.isArray(body?.firas) ? body!.firas : null
    const fromBodyInvoices = Array.isArray(body?.invoices) ? body!.invoices : null

    const firas =
      fromBodyFiras ??
      listFiras().map((s) => s.parsed)
    const invoices =
      fromBodyInvoices ??
      listInvoices().map((s) => s.parsed)

    const batch = await runBatchMatching(
      firas as Parameters<typeof runBatchMatching>[0],
      invoices as Parameters<typeof runBatchMatching>[1],
      grokOpenAI,
    )

    const rowIds = batch.results.map(() => randomUUID())
    setMatchRun(batch, rowIds)

    res.status(201).json({
      ...batch,
      rowIds,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    res.status(500).json({ error: msg })
  }
})

matchingRouter.get('/results', (_req: Request, res: Response) => {
  res.json({ items: listMatchRows() })
})

matchingRouter.put('/:id/approve', (req: Request, res: Response) => {
  const raw = req.params.id
  const id = Array.isArray(raw) ? raw[0] : raw
  if (!id) {
    res.status(400).json({ error: 'Missing id' })
    return
  }
  if (!getMatchRow(id)) {
    res.status(404).json({ error: 'Match row not found' })
    return
  }
  approveMatchRow(id)
  res.json({ ok: true, item: getMatchRow(id) })
})

matchingRouter.put('/:id/reject', (req: Request, res: Response) => {
  const raw = req.params.id
  const id = Array.isArray(raw) ? raw[0] : raw
  if (!id) {
    res.status(400).json({ error: 'Missing id' })
    return
  }
  if (!getMatchRow(id)) {
    res.status(404).json({ error: 'Match row not found' })
    return
  }
  rejectMatchRow(id)
  res.json({ ok: true, item: getMatchRow(id) })
})

matchingRouter.put('/:id/override', (req: Request, res: Response) => {
  const raw = req.params.id
  const id = Array.isArray(raw) ? raw[0] : raw
  if (!id) {
    res.status(400).json({ error: 'Missing id' })
    return
  }
  const inv =
    typeof req.body?.invoiceNumber === 'string'
      ? req.body.invoiceNumber.trim()
      : typeof req.body?.matchedInvoiceNumber === 'string'
        ? req.body.matchedInvoiceNumber.trim()
        : ''
  if (!inv) {
    res
      .status(400)
      .json({ error: 'Body must include invoiceNumber (or matchedInvoiceNumber)' })
    return
  }
  if (!getMatchRow(id)) {
    res.status(404).json({ error: 'Match row not found' })
    return
  }
  overrideMatchRow(id, inv)
  res.json({ ok: true, item: getMatchRow(id) })
})
