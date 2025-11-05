import { getApiBase } from './api'
const API_BASE = getApiBase()
import { getCurrentUser } from './users'

function authHeaders(base = {}) {
  const u = getCurrentUser()
  const token = u?.token
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

async function handleJson(res) {
  const txt = await res.text()
  let data = null
  try { data = txt ? JSON.parse(txt) : null } catch { /* ignore */ }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

export async function getReasons() {
  const res = await fetch(`${API_BASE}/reasons`, { headers: { 'Content-Type': 'application/json' } })
  return handleJson(res)
}

export async function createReasonCategory({ name, sort = 0 }) {
  const res = await fetch(`${API_BASE}/reasons/category`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, sort }),
  })
  return handleJson(res)
}

export async function updateReasonCategory(id, { name, sort, status }) {
  const res = await fetch(`${API_BASE}/reasons/category/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, sort, status }),
  })
  return handleJson(res)
}

export async function deleteReasonCategory(id) {
  const res = await fetch(`${API_BASE}/reasons/category/${id}`, {
    method: 'DELETE',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
  })
  return handleJson(res)
}

export async function createReasonItem({ categoryId, name, sort = 0 }) {
  const res = await fetch(`${API_BASE}/reasons/item`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ categoryId, name, sort }),
  })
  return handleJson(res)
}

export async function updateReasonItem(id, { name, sort, status }) {
  const res = await fetch(`${API_BASE}/reasons/item/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, sort, status }),
  })
  return handleJson(res)
}

export async function deleteReasonItem(id) {
  const res = await fetch(`${API_BASE}/reasons/item/${id}`, {
    method: 'DELETE',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
  })
  return handleJson(res)
}

export async function reorderCategories(ids) {
  const res = await fetch(`${API_BASE}/reasons/category/reorder`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ids }),
  })
  return handleJson(res)
}

export async function reorderItems(categoryId, ids) {
  const res = await fetch(`${API_BASE}/reasons/item/reorder`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ categoryId, ids }),
  })
  return handleJson(res)
}

export function findDefaultSelection(reasons) {
  // 默认选择："其他" 分类下的 "未分类" 项
  const cat = reasons.find(c => String(c.name) === '其他') || reasons[0]
  const item = (cat && (cat.items || []).find(i => String(i.name) === '未分类')) || (cat?.items?.[0]) || null
  return { categoryId: cat?.id || null, itemId: item?.id || null }
}