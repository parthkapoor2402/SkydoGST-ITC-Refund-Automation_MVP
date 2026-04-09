import { Router, type Request, type Response } from 'express'
import PDFDocument from 'pdfkit'
import { exportToCSV } from '../modules/rfd01Generator.js'
import {
  buildStatement3B,
  buildStatementJson,
  generateSummaryReport,
} from '../services/rfd01Generator.js'
import {
  getLastStatement,
  setReportData,
} from '../services/reportSessionStore.js'
import type { ApprovedMatch, Statement3B } from '../types/index.js'

export const reportRouter = Router()

function readApprovedMatches(body: unknown): ApprovedMatch[] | null {
  if (!body || typeof body !== 'object') return null
  const raw = (body as { approvedMatches?: unknown }).approvedMatches
  if (!Array.isArray(raw)) return null
  return raw as ApprovedMatch[]
}

reportRouter.post('/generate', (req: Request, res: Response) => {
  const matches = readApprovedMatches(req.body)
  if (!matches) {
    res
      .status(400)
      .json({ error: 'Body must include approvedMatches: ApprovedMatch[]' })
    return
  }

  try {
    const statement = buildStatement3B(matches)
    const summary = generateSummaryReport(statement)
    setReportData(matches, statement)
    res.status(201).json({
      statement,
      summary,
      json: buildStatementJson(matches),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    res.status(400).json({ error: msg })
  }
})

reportRouter.get('/preview', (_req: Request, res: Response) => {
  const statement = getLastStatement()
  if (!statement) {
    res
      .status(404)
      .json({ error: 'No report generated yet. POST /generate first.' })
    return
  }
  res.json(buildStatementJsonFromStatement(statement))
})

function buildStatementJsonFromStatement(statement: Statement3B) {
  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    statement,
  }
}

reportRouter.get('/export/csv', (_req: Request, res: Response) => {
  const statement = getLastStatement()
  if (!statement) {
    res.status(404).send('No report generated yet.')
    return
  }
  const csv = exportToCSV(statement)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="rfd01-statement-3b.csv"',
  )
  res.send(csv)
})

reportRouter.get('/export/summary', (_req: Request, res: Response) => {
  const statement = getLastStatement()
  if (!statement) {
    res.status(404).send('No report generated yet.')
    return
  }

  const summary = generateSummaryReport(statement)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="rfd01-summary.pdf"',
  )

  const doc = new PDFDocument({ margin: 50 })
  doc.pipe(res)

  doc.fontSize(18).text('RFD-01 Statement 3B — Summary', { underline: true })
  doc.moveDown()
  doc.fontSize(11)
  doc.text(`Generated: ${new Date().toISOString()}`)
  doc.moveDown()
  doc.text(`Exporter GSTIN: ${summary.exporterGstin}`)
  doc.text(`Transactions: ${summary.transactionCount}`)
  doc.text(`Period: ${summary.periodFrom} to ${summary.periodTo}`)
  doc.text(`Total taxable value (INR): ${summary.totalTaxableValueInr.toFixed(2)}`)
  doc.text(
    `Eligible refund estimate (18% proxy, INR): ${summary.totalEligibleRefundEstimateInr.toFixed(2)}`,
  )
  doc.moveDown()
  doc.text(
    `LUT reference(s): ${summary.lutNumbersUsed.length ? summary.lutNumbersUsed.join(', ') : '—'}`,
  )
  doc.moveDown()
  doc.fontSize(9).fillColor('#444444')
  doc.text(
    'Note: Eligible refund uses 18% of total taxable value as a placeholder when input ITC registers are not attached.',
    { width: 500 },
  )

  doc.end()
})
