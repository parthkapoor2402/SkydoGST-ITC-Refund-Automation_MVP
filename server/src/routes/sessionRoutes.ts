import { Router, type Request, type Response } from 'express'
import { clearBundlePdfBuffers } from '../services/bundleBufferStore.js'
import { clearAllFiras } from '../services/firaSessionStore.js'
import { clearAllInvoices } from '../services/invoiceSessionStore.js'
import { clearMatchSession } from '../services/matchingSessionStore.js'
import { clearReportData } from '../services/reportSessionStore.js'

export const sessionRouter = Router()

sessionRouter.post('/clear-firas', (_req: Request, res: Response) => {
  clearAllFiras()
  res.json({ ok: true })
})

sessionRouter.post('/clear-invoices', (_req: Request, res: Response) => {
  clearAllInvoices()
  res.json({ ok: true })
})

/** Clears in-memory workflow state (FIRAs, invoices, matches, report, bundle buffers). */
sessionRouter.post('/reset', (_req: Request, res: Response) => {
  clearAllFiras()
  clearAllInvoices()
  clearMatchSession()
  clearReportData()
  clearBundlePdfBuffers()
  res.json({ ok: true })
})
