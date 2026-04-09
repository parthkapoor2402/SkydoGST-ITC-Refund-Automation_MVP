import { callGrokMatch } from '../lib/grokClient.js'

const JSON_FENCE = /```(?:json)?\s*([\s\S]*?)```/i

function parseJsonFromText<T>(text: string): T | null {
  const trimmed = text.trim()
  const fence = JSON_FENCE.exec(trimmed)
  const payload = fence ? fence[1]!.trim() : trimmed
  try {
    return JSON.parse(payload) as T
  } catch {
    return null
  }
}

export async function completeJson<T>(body: {
  system: string
  user: string
}): Promise<T | null> {
  const raw = await callGrokMatch(body)
  return parseJsonFromText<T>(raw)
}
