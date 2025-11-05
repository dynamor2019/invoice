// API base normalization helper to avoid malformed paths and 404s
// Ensures the base always points to '/api' (relative) or '<origin>/api' (absolute),
// strips trailing slashes, and handles misconfigurations like '/' or empty.

export function getApiBase() {
  const raw = import.meta?.env?.VITE_API_BASE
  let base = typeof raw === 'string' ? raw.trim() : ''
  if (!base || base === '/') base = '/api'
  base = base.replace(/\/+$/, '')
  // If base doesn't end with '/api', fix it
  if (!/\/api$/.test(base)) {
    if (/^https?:\/\//i.test(base)) {
      base = `${base}/api`
    } else {
      base = '/api'
    }
  }
  return base
}

export function getApiHost() {
  const base = getApiBase()
  return base.replace(/\/api$/, '')
}