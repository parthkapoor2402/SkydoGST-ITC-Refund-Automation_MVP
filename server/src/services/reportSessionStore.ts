import type { ApprovedMatch, Statement3B } from '../types/index.js'

let lastMatches: ApprovedMatch[] | null = null
let lastStatement: Statement3B | null = null

export function setReportData(
  matches: ApprovedMatch[],
  statement: Statement3B,
): void {
  lastMatches = matches
  lastStatement = statement
}

export function getLastMatches(): ApprovedMatch[] | null {
  return lastMatches
}

export function getLastStatement(): Statement3B | null {
  return lastStatement
}

export function clearReportData(): void {
  lastMatches = null
  lastStatement = null
}
