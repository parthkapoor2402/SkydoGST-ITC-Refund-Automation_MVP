import type { ParsedFIRA } from '../modules/firaParser.js'

export interface StoredFira {
  id: string
  parsed: ParsedFIRA
  sourceFileName?: string
}

const firaById = new Map<string, StoredFira>()

export function storeFira(entry: StoredFira): void {
  firaById.set(entry.id, entry)
}

export function getFira(id: string): StoredFira | undefined {
  return firaById.get(id)
}

export function listFiras(): StoredFira[] {
  return Array.from(firaById.values())
}

export function deleteFira(id: string): boolean {
  return firaById.delete(id)
}

export function clearAllFiras(): void {
  firaById.clear()
}
