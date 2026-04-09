import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { downloadRouter } from './routes/downloadRoutes.js'
import { firaRouter } from './routes/firaRoutes.js'
import { invoiceRouter } from './routes/invoiceRoutes.js'
import { matchingRouter } from './routes/matchingRoutes.js'
import { reportRouter } from './routes/reportRoutes.js'
import { sessionRouter } from './routes/sessionRoutes.js'
import { testResetRouter } from './routes/testResetRoutes.js'
import { clearBundlePdfBuffers } from './services/bundleBufferStore.js'
import { clearAllFiras } from './services/firaSessionStore.js'
import { clearAllInvoices } from './services/invoiceSessionStore.js'
import { clearMatchSession } from './services/matchingSessionStore.js'
import { clearReportData } from './services/reportSessionStore.js'

export function createApp(): express.Express {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '15mb' }))

  const API_VERSION = '1.0.0'

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version: API_VERSION })
  })

  const runFullSessionReset: express.RequestHandler = (_req, res) => {
    clearAllFiras()
    clearAllInvoices()
    clearMatchSession()
    clearReportData()
    clearBundlePdfBuffers()
    res.json({ ok: true })
  }

  /** POST + GET: Streamlit uses POST; GET is a fallback if POST is stripped by a proxy. */
  app.post('/api/session/reset', runFullSessionReset)
  app.get('/api/session/reset', runFullSessionReset)

  /** Top-level POSTs so session routes always resolve. */
  app.post('/api/session/clear-firas', (_req, res) => {
    clearAllFiras()
    res.json({ ok: true })
  })
  app.post('/api/session/clear-invoices', (_req, res) => {
    clearAllInvoices()
    res.json({ ok: true })
  })

  app.use('/api/fira', firaRouter)
  app.use('/api/invoices', invoiceRouter)
  app.use('/api/match', matchingRouter)
  app.use('/api/report', reportRouter)
  app.use('/api/download', downloadRouter)
  app.use('/api/session', sessionRouter)

  /** E2E reset + local dev: enabled whenever not in production (Playwright reuseExistingServer often skips env flags). */
  const testRoutesOn =
    process.env.ENABLE_TEST_ROUTES === '1' ||
    process.env.NODE_ENV !== 'production'
  if (testRoutesOn) {
    app.use('/api/test', testResetRouter)
  }

  return app
}
