import { Router, type Request, type Response } from 'express'
import { exportToCSV, generateSummaryReport } from '../modules/rfd01Generator.js'
import {
  assembleCABundle,
  getBundleZipBaseName,
  refundSummaryPdfBuffer,
} from '../modules/zipPackager.js'
import {
  getBundleFiraPdfBuffers,
  getBundleInvoicePdfBuffers,
} from '../services/bundleBufferStore.js'
import { getLastMatches, getLastStatement } from '../services/reportSessionStore.js'

export const downloadRouter = Router()

downloadRouter.get('/bundle', async (_req: Request, res: Response) => {
  const statement = getLastStatement()
  const matches = getLastMatches()
  if (!statement) {
    res.status(404).json({ error: 'No report generated yet. POST /api/report/generate first.' })
    return
  }
  const approved = matches ?? []

  try {
    const summary = generateSummaryReport(statement)
    const zipName = `${getBundleZipBaseName(summary.exporterGstin, summary)}.zip`
    const zip = await assembleCABundle(
      statement,
      approved,
      getBundleFiraPdfBuffers(),
      getBundleInvoicePdfBuffers(),
    )
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`)
    res.setHeader('Content-Length', String(zip.length))
    res.send(zip)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    res.status(500).json({ error: msg })
  }
})

downloadRouter.get('/statement-csv', (_req: Request, res: Response) => {
  const statement = getLastStatement()
  if (!statement) {
    res.status(404).send('No report generated yet.')
    return
  }
  const summary = generateSummaryReport(statement)
  const gstin = (summary.exporterGstin || 'UNKNOWN').replace(/[^\w]/g, '_')
  const csv = exportToCSV(statement)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="RFD01_Statement3B_${gstin}.csv"`,
  )
  res.send(csv)
})

downloadRouter.get('/summary-pdf', async (_req: Request, res: Response) => {
  const statement = getLastStatement()
  if (!statement) {
    res.status(404).send('No report generated yet.')
    return
  }
  try {
    const summary = generateSummaryReport(statement)
    const pdf = await refundSummaryPdfBuffer(summary)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Refund_Summary.pdf"',
    )
    res.setHeader('Content-Length', String(pdf.length))
    res.send(pdf)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    res.status(500).json({ error: msg })
  }
})
