import { Router, type Request, type Response } from 'express'
import { clearBundlePdfBuffers } from '../services/bundleBufferStore.js'
import { clearAllFiras } from '../services/firaSessionStore.js'
import { clearAllInvoices } from '../services/invoiceSessionStore.js'
import { clearMatchSession } from '../services/matchingSessionStore.js'
import { clearReportData } from '../services/reportSessionStore.js'

export const testResetRouter = Router()

testResetRouter.post('/reset', (_req: Request, res: Response) => {
  clearAllFiras()
  clearAllInvoices()
  clearMatchSession()
  clearReportData()
  clearBundlePdfBuffers()
  res.json({ ok: true })
})
