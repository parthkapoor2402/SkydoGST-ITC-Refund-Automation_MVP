/** API origin; empty uses same-origin `/api` (Vite dev proxy). */
export function getApiBase(): string {
  return (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
}

export function apiUrl(path: string): string {
  const base = getApiBase()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
