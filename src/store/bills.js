import { getApprovalOrder, getCurrentUser } from './users';
import { getApiBase } from './api'
const API_BASE = getApiBase()

function authHeaders(base = {}) {
  const u = getCurrentUser()
  const token = u?.token
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

export async function seedBills() {
  const list = await getBills()
  if (list.length > 0) return
  const steps = [...await getApprovalOrder(), 'accountant']
  const sample = [
    { id: '1', title: '差旅报销', amount: 1000, category: '差旅', date: '2025-10-01', createdBy: 'admin', status: 'pending', steps, currentStepIndex: 0, history: [] },
    { id: '2', title: '办公采购', amount: 500, category: '采购', date: '2025-10-02', createdBy: 'approver1', status: 'pending', steps, currentStepIndex: 0, history: [] },
  ]
  for (const b of sample) {
    await fetch(`${API_BASE}/bill`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(b)
    })
  }
}

export function getBills() {
  return fetch(`${API_BASE}/bills`).then(r => r.json())
}

export function getArchivedBills() {
  return fetch(`${API_BASE}/bills/archived`).then(r => r.json())
}

export function getTodosByRole(role) {
  return fetch(`${API_BASE}/todos/${encodeURIComponent(role)}`).then(async (r) => {
    if (!r.ok) return []
    try { return await r.json() } catch { return [] }
  })
}

export async function setBills(bills) {
  // 简化为逐条 upsert
  for (const b of bills) {
    await fetch(`${API_BASE}/bill`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(b)
    })
  }
}

export async function createBill({ title, amount, category, date }) {
  const creator = getCurrentUser();
  const steps = [...await getApprovalOrder(), 'accountant'];
  const payload = {
    title,
    amount: Number(amount || 0),
    category,
    date,
    createdBy: creator?.id || 'admin',
    status: 'pending',
    steps,
    currentStepIndex: 0,
    history: [],
  }
  const res = await fetch(`${API_BASE}/bill`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    let err = {}
    try { err = await res.json() } catch {}
    throw new Error(err.error || `创建票据失败(${res.status})`)
  }
  const saved = await res.json().catch(() => null)
  // 后端返回的票据对象包含最终的唯一 id
  return saved || payload
}

export async function getTodosForRole(role) {
  const all = await getBills()
  return all.filter(b => b.status === 'pending' && b.steps[b.currentStepIndex] === role)
}

export async function approveBill(id, role) {
  const res = await fetch(`${API_BASE}/bill/approve`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id, role })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '审批失败')
  }
  return res.json()
}

export async function rejectBill(id, role, reason = '') {
  const res = await fetch(`${API_BASE}/bill/reject`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id, role, reason })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '拒绝失败')
  }
  return res.json()
}

// 发起人对被一级拒绝的票据修改后再次提交至审批流
export async function resubmitBill(id, editorId, updates = {}) {
  const res = await fetch(`${API_BASE}/bill/resubmit`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id, editorId, updates })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '再次提交失败')
  }
  return res.json()
}

export async function getBillById(id) {
  const res = await fetch(`${API_BASE}/bill/${id}`)
  if (!res.ok) return null
  return res.json()
}

export async function deleteBill(id) {
  const res = await fetch(`${API_BASE}/bill/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    let err = {}
    try { err = await res.json() } catch {}
    throw new Error(err.error || `删除失败(${res.status})`)
  }
  return true
}