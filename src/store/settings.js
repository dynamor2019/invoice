import { getCurrentUser } from './users'

const API_BASE = (import.meta?.env?.VITE_API_BASE) || '/api'

export async function getCompanyName() {
  const res = await fetch(`${API_BASE}/setting/companyName`)
  if (!res.ok) throw new Error(`获取公司名称失败(${res.status})`)
  const data = await res.json().catch(() => ({}))
  return String(data.companyName || '')
}

export async function setCompanyName(name) {
  const u = getCurrentUser()
  const headers = { 'Content-Type': 'application/json' }
  if (u?.token) headers['Authorization'] = `Bearer ${u.token}`
  const res = await fetch(`${API_BASE}/setting/companyName`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ companyName: String(name || '').slice(0, 100) }),
  })
  if (!res.ok) throw new Error(`保存公司名称失败(${res.status})`)
  return true
}
