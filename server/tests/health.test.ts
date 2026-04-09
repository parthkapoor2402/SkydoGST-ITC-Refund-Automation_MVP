import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'

describe('health', () => {
  const app = createApp()

  it('GET /health returns legacy ok payload', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('GET /api/health returns status and version', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok', version: '1.0.0' })
  })

  it('POST /api/session/reset clears session', async () => {
    const res = await request(app).post('/api/session/reset')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('GET /api/session/reset clears session', async () => {
    const res = await request(app).get('/api/session/reset')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('POST /api/session/clear-firas responds ok', async () => {
    const res = await request(app).post('/api/session/clear-firas')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('POST /api/session/clear-invoices responds ok', async () => {
    const res = await request(app).post('/api/session/clear-invoices')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})
