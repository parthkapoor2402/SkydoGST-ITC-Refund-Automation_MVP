import path from 'node:path'
import { fileURLToPath } from 'node:url'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import type { ParsedFIRA } from '../../modules/firaParser.js'
import type { ParsedInvoice } from '../../modules/invoiceParser.js'
import { clearBundlePdfBuffers } from '../../services/bundleBufferStore.js'
import { clearAllFiras } from '../../services/firaSessionStore.js'
import { clearAllInvoices } from '../../services/invoiceSessionStore.js'
import { clearMatchSession } from '../../services/matchingSessionStore.js'
import { clearReportData } from '../../services/reportSessionStore.js'
import type { ApprovedMatch, FiraRecord, InvoiceRecord } from '../../types/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const e2eFixtures = path.join(__dirname, '../../../../e2e/fixtures')

function mapFira(sf: {
  id: string
  sourceFileName?: string
  parsed: ParsedFIRA
}): FiraRecord {
  return {
    id: sf.id,
    sourceFileName: sf.sourceFileName ?? 'fira.json',
    amountInr: sf.parsed.creditedAmountInr.value,
    valueDate: sf.parsed.valueDateIso,
    remitterNameRaw: sf.parsed.remitterName,
    referenceNo: sf.parsed.referenceNumber,
    parseConfidence: 0.95,
    currencyOriginal: sf.parsed.amountForeign.currency,
    amountOriginal: sf.parsed.amountForeign.value,
  }
}

function mapInv(si: {
  id: string
  sourceFileName?: string
  parsed: ParsedInvoice
}): InvoiceRecord {
  const p = si.parsed
  const invoiceValue = p.taxableValueInr + p.igstAmount
  return {
    id: si.id,
    sourceFileName: si.sourceFileName ?? 'inv.json',
    supplierGstin: p.exporterGSTIN,
    invoiceNo: p.invoiceNumber,
    invoiceDate: p.invoiceDate,
    invoiceValue,
    taxableValue: p.taxableValueInr,
    integratedTax: p.igstAmount,
    clientNameRaw: p.client.name,
    parseConfidence: 0.9,
    currency: p.totalAmount.currency,
    amountOriginal: p.totalAmount.value,
  }
}

function buildApprovedMatches(
  firas: Array<{ id: string; sourceFileName?: string; parsed: ParsedFIRA }>,
  invoices: Array<{ id: string; sourceFileName?: string; parsed: ParsedInvoice }>,
  rows: Array<{
    id: string
    decision: string
    overrideInvoiceNumber?: string | null
    match: {
      firaReferenceNumber: string
      matchedInvoiceNumber: string | null
    }
  }>,
): ApprovedMatch[] {
  const now = new Date().toISOString()
  const out: ApprovedMatch[] = []
  for (const row of rows) {
    if (row.decision !== 'approved' && row.decision !== 'overridden') continue
    const invNo =
      row.overrideInvoiceNumber ?? row.match.matchedInvoiceNumber ?? null
    if (!invNo) continue
    const sf = firas.find((f) => f.parsed.referenceNumber === row.match.firaReferenceNumber)
    const si = invoices.find((i) => i.parsed.invoiceNumber === invNo)
    if (!sf || !si) continue
    out.push({
      fira: mapFira(sf),
      invoice: mapInv(si),
      approvedBy: 'integration-test',
      approvedAt: now,
    })
  }
  return out
}

describe('full API flow', () => {
  const app = createApp()
  const prevGrok = process.env.E2E_MOCK_GROK

  beforeAll(() => {
    process.env.E2E_MOCK_GROK = '1'
  })

  afterAll(() => {
    process.env.E2E_MOCK_GROK = prevGrok
  })

  beforeEach(() => {
    clearAllFiras()
    clearAllInvoices()
    clearMatchSession()
    clearReportData()
    clearBundlePdfBuffers()
  })

  it('upload → list → match → approve → report → zip', async () => {
    const firaFiles = [
      path.join(e2eFixtures, 'happy', 'fira-hp-01.json'),
      path.join(e2eFixtures, 'happy', 'fira-hp-02.json'),
      path.join(e2eFixtures, 'happy', 'fira-hp-03.json'),
    ]
    let upFira = request(app).post('/api/fira/upload')
    for (const f of firaFiles) {
      upFira = upFira.attach('files', f)
    }
    const upFiraRes = await upFira.expect(201)
    expect(upFiraRes.body.errors ?? []).toEqual([])

    const invFiles = [
      path.join(e2eFixtures, 'happy', 'inv-hp-01.json'),
      path.join(e2eFixtures, 'happy', 'inv-hp-02.json'),
      path.join(e2eFixtures, 'happy', 'inv-hp-03.json'),
    ]
    let upInv = request(app).post('/api/invoices/upload')
    for (const f of invFiles) {
      upInv = upInv.attach('files', f)
    }
    const upInvRes = await upInv.expect(201)
    expect(upInvRes.body.errors ?? []).toEqual([])

    const listFira = await request(app).get('/api/fira/list').expect(200)
    expect(listFira.body.items).toHaveLength(3)

    const listInv = await request(app).get('/api/invoices/list').expect(200)
    expect(listInv.body.items).toHaveLength(3)

    const matchRes = await request(app).post('/api/match/run').expect(201)
    expect(matchRes.body.results).toHaveLength(3)
    expect(matchRes.body.summary.autoApproved).toBe(2)
    expect(matchRes.body.summary.pendingUser).toBe(1)

    const rowsRes = await request(app).get('/api/match/results').expect(200)
    const rows = rowsRes.body.items as Array<{
      id: string
      decision: string
      match: { firaReferenceNumber: string; matchedInvoiceNumber: string | null }
      overrideInvoiceNumber?: string | null
    }>

    for (const row of rows) {
      await request(app).put(`/api/match/${encodeURIComponent(row.id)}/approve`).expect(200)
    }

    const rowsAfter = (await request(app).get('/api/match/results').expect(200)).body
      .items as typeof rows

    const approvedMatches = buildApprovedMatches(
      listFira.body.items,
      listInv.body.items,
      rowsAfter,
    )
    expect(approvedMatches).toHaveLength(3)

    await request(app)
      .post('/api/report/generate')
      .send({ approvedMatches })
      .expect(201)

    const preview = await request(app).get('/api/report/preview').expect(200)
    expect(preview.body.statement.rows).toHaveLength(3)

    const zipRes = await request(app).get('/api/download/bundle').buffer(true).parse((res, cb) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => {
        chunks.push(c)
      })
      res.on('end', () => {
        cb(null, Buffer.concat(chunks))
      })
    }).expect(200)
    expect(String(zipRes.headers['content-type'])).toMatch(/application\/zip/)
    expect(Buffer.isBuffer(zipRes.body)).toBe(true)
    expect((zipRes.body as Buffer).length).toBeGreaterThan(100)
  })
})
