import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect, type APIRequestContext } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = (...segments: string[]) =>
  path.join(__dirname, '..', 'fixtures', ...segments)

async function resetSession(request: APIRequestContext) {
  const res = await request.post('/api/test/reset')
  expect(res.ok()).toBeTruthy()
}

test.describe('GST refund flow', () => {
  test.beforeEach(async ({ request }) => {
    await resetSession(request)
  })

  test('user can upload FIRAs and invoices and download CA bundle', async ({
    page,
  }) => {
    await page.goto('/upload')
    await expect(page.getByRole('heading', { name: /Step 1: Upload/i })).toBeVisible()

    const firaInput = page.locator('input[type="file"]').nth(0)
    const invInput = page.locator('input[type="file"]').nth(1)

    await firaInput.setInputFiles([
      fixtures('happy', 'fira-hp-01.json'),
      fixtures('happy', 'fira-hp-02.json'),
      fixtures('happy', 'fira-hp-03.json'),
    ])
    await expect(page.getByText('3 FIRAs uploaded')).toBeVisible({ timeout: 15_000 })

    await invInput.setInputFiles([
      fixtures('happy', 'inv-hp-01.json'),
      fixtures('happy', 'inv-hp-02.json'),
      fixtures('happy', 'inv-hp-03.json'),
    ])
    await expect(page.getByText('3 invoices uploaded')).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: /Start matching/i }).click()

    await expect(page.getByText('AUTO-MATCHED')).toBeVisible({ timeout: 60_000 })
    await expect(
      page.getByText(/2 pairs matched automatically/i),
    ).toBeVisible()
    await expect(page.getByText('NEEDS REVIEW')).toBeVisible()
    await expect(
      page.getByText(/1 pair need your confirmation|pairs need your confirmation/i),
    ).toBeVisible()

    const autoDetails = page.locator('details').filter({ hasText: 'AUTO-MATCHED' })
    await autoDetails.locator('summary').click()
    await autoDetails.getByRole('button', { name: 'Approve all' }).click()
    await expect(page.getByText('Auto-matched pairs approved')).toBeVisible({
      timeout: 15_000,
    })

    const reviewApprove = page
      .locator('details')
      .filter({ hasText: 'NEEDS REVIEW' })
      .getByRole('button', { name: 'Approve' })
    await reviewApprove.click()

    await page.getByRole('button', { name: /Generate CA report/i }).click()
    await expect(page.getByRole('heading', { name: /Step 3: Generate report/i })).toBeVisible({
      timeout: 30_000,
    })

    const tbody = page.locator('table tbody')
    await expect(tbody.locator('tr')).toHaveCount(3)

    for (const utr of ['UTR-HP-01', 'UTR-HP-02', 'UTR-HP-03']) {
      await expect(page.locator(`input[value="${utr}"]`)).toHaveCount(1)
    }

    await page.getByRole('button', { name: /Generate CA bundle/i }).click()
    await expect(page.getByRole('heading', { name: /Download bundle/i })).toBeVisible({
      timeout: 15_000,
    })

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 })
    await page
      .getByRole('button', {
        name: /Download ZIP bundle for chartered accountant|Download bundle for CA/i,
      })
      .click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.zip$/i)
  })

  test('ambiguous match triggers Grok AI suggestion', async ({ page }) => {
    await page.goto('/upload')
    const firaInput = page.locator('input[type="file"]').nth(0)
    const invInput = page.locator('input[type="file"]').nth(1)

    await firaInput.setInputFiles([fixtures('grok', 'fira-grok.json')])
    await invInput.setInputFiles([
      fixtures('grok', 'inv-grok-a.json'),
      fixtures('grok', 'inv-grok-b.json'),
    ])

    await page.getByRole('button', { name: /Start matching/i }).click()

    await expect(page.getByText('NEEDS REVIEW')).toBeVisible({ timeout: 60_000 })
    const details = page.locator('details').filter({ hasText: 'NEEDS REVIEW' })
    await expect(
      details.locator('span').filter({ hasText: /^AI-assisted$/ }),
    ).toBeVisible()
    await expect(details.getByText(/AI review:/i)).toBeVisible()
    await expect(details.getByText(/AI-assisted match/i)).toBeVisible()

    await expect(
      details.getByRole('button', { name: 'Approve' }),
    ).toBeVisible()
  })

  test('invalid FIRA file shows clear error message', async ({ page }) => {
    await page.goto('/upload')
    const firaInput = page.locator('input[type="file"]').nth(0)

    await firaInput.setInputFiles([
      fixtures('errors', 'fira-bad.json'),
      fixtures('errors', 'fira-good.json'),
    ])

    await expect(
      page.getByText('File could not be parsed — please check format'),
    ).toBeVisible({ timeout: 15_000 })

    await expect(page.getByText('UTR-ERR-GOOD')).toBeVisible()
    await expect(page.getByText('1 FIRA uploaded')).toBeVisible()
  })

  test('user can manually link unmatched FIRA to invoice', async ({ page }) => {
    await page.goto('/upload')
    const firaInput = page.locator('input[type="file"]').nth(0)
    const invInput = page.locator('input[type="file"]').nth(1)

    await firaInput.setInputFiles([fixtures('manual', 'fira-jp.json')])
    await invInput.setInputFiles([fixtures('manual', 'inv-in.json')])

    await page.getByRole('button', { name: /Start matching/i }).click()

    await expect(page.getByText('UNMATCHED')).toBeVisible({ timeout: 60_000 })

    const unmatched = page.locator('details').filter({ hasText: 'UNMATCHED' })
    await unmatched.locator('summary').click()
    await unmatched.locator('input[type="search"]').first().fill('INV-MO')
    const linkSelect = unmatched.getByLabel('Link FIRA to invoice')
    await linkSelect.selectOption({ value: 'INV-MO-IN' })

    await expect(page.getByText('Invoice linked')).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByText('Approved', { exact: true }).last(),
    ).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: /Generate CA report/i }).click()
    await expect(page.getByRole('heading', { name: /Step 3: Generate report/i })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.locator('table tbody tr')).toHaveCount(1)
    await expect(page.locator('input[value="INV-MO-IN"]')).toHaveCount(1)
  })

  test('Statement 3B columns match GST Council specification', async ({
    page,
  }) => {
    await page.goto('/upload')
    const firaInput = page.locator('input[type="file"]').nth(0)
    const invInput = page.locator('input[type="file"]').nth(1)

    await firaInput.setInputFiles([fixtures('spec', 'fira-spec.json')])
    await invInput.setInputFiles([fixtures('spec', 'inv-spec.json')])

    await page.getByRole('button', { name: /Start matching/i }).click()
    await expect(page.getByText('AUTO-MATCHED')).toBeVisible({ timeout: 60_000 })
    const specAuto = page.locator('details').filter({ hasText: 'AUTO-MATCHED' })
    await specAuto.locator('summary').click()
    await specAuto.getByRole('button', { name: 'Approve all' }).click()
    await page.getByRole('button', { name: /Generate CA report/i }).click()
    await expect(page.getByRole('heading', { name: /Step 3: Generate report/i })).toBeVisible({
      timeout: 30_000,
    })

    const gstinCell = page.getByRole('textbox', {
      name: /GSTIN of Supplier for INV-SPEC-001/i,
    })
    await expect(gstinCell).toHaveValue('27AABCU9603R1ZX')

    const brcCell = page.getByRole('textbox', {
      name: /BRC\/FIRC No\. for INV-SPEC-001/i,
    })
    await expect(brcCell).toHaveValue('SPEC-UTR-999')

    const taxableCell = page.getByRole('textbox', {
      name: /Taxable Value \(INR\) for INV-SPEC-001/i,
    })
    await expect(taxableCell).toHaveValue('250000')

    const invDateCell = page.getByRole('textbox', {
      name: /Invoice Date for INV-SPEC-001/i,
    })
    const invDate = await invDateCell.inputValue()
    expect(invDate).toMatch(/^\d{2}[-/]\d{2}[-/]\d{4}$/)

    const brcDateCell = page.getByRole('textbox', {
      name: /BRC\/FIRC Date for INV-SPEC-001/i,
    })
    const brcDate = await brcDateCell.inputValue()
    expect(brcDate).toMatch(/^\d{2}[-/]\d{2}[-/]\d{4}$/)
  })
})
