import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { downloadRouter } from './routes/downloadRoutes.js'
import { firaRouter } from './routes/firaRoutes.js'
import { invoiceRouter } from './routes/invoiceRoutes.js'
import { matchingRouter } from './routes/matchingRoutes.js'
import { reportRouter } from './routes/reportRoutes.js'
import { testResetRouter } from './routes/testResetRoutes.js'

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

  app.use('/api/fira', firaRouter)
  app.use('/api/invoices', invoiceRouter)
  app.use('/api/match', matchingRouter)
  app.use('/api/report', reportRouter)
  app.use('/api/download', downloadRouter)

  /** E2E reset + local dev: enabled whenever not in production (Playwright reuseExistingServer often skips env flags). */
  const testRoutesOn =
    process.env.ENABLE_TEST_ROUTES === '1' ||
    process.env.NODE_ENV !== 'production'
  if (testRoutesOn) {
    app.use('/api/test', testResetRouter)
  }

  return app
}
