import OpenAI from 'openai'

const GROK_BASE_URL = 'https://api.x.ai/v1'
const GROK_MODEL = 'grok-3-mini'

export const grokOpenAI = new OpenAI({
  apiKey: process.env.GROK_API_KEY ?? '',
  baseURL: GROK_BASE_URL,
})

const RETRY_DELAYS_MS = [0, 1_000, 3_000, 9_000]

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function extractStatus(err: unknown): number {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const s = (err as { status: unknown }).status
    return typeof s === 'number' ? s : 0
  }
  return 0
}

/**
 * Calls Grok with basic rate-limit handling and retries (429 / transient).
 */
export async function callGrokMatch(body: {
  system: string
  user: string
}): Promise<string> {
  let lastErr: unknown
  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    const delay = RETRY_DELAYS_MS[i] ?? 0
    if (delay > 0) await sleep(delay)
    try {
      const res = await grokOpenAI.chat.completions.create({
        model: GROK_MODEL,
        messages: [
          { role: 'system', content: body.system },
          { role: 'user', content: body.user },
        ],
        temperature: 0.2,
      })
      return res.choices[0]?.message?.content ?? ''
    } catch (e) {
      lastErr = e
      const st = extractStatus(e)
      const retryable = st === 429 || st === 503 || st === 502
      if (retryable && i < RETRY_DELAYS_MS.length - 1) continue
      throw e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}
