import { getCurrentUser } from './users'

import { getApiBase } from './api'
const API_BASE = getApiBase()

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

// 审批免审阈值设置
export async function getApprovalThresholds() {
  const res = await fetch(`${API_BASE}/setting/approvalThresholds`)
  if (!res.ok) throw new Error(`获取免审阈值失败(${res.status})`)
  const data = await res.json().catch(() => ({}))
  return {
    approver1: Number(data.approver1) || 0,
    approver2: Number(data.approver2) || 0,
    approver3: Number(data.approver3) || 0,
  }
}

export async function setApprovalThresholds({ approver1 = 0, approver2 = 0, approver3 = 0 }) {
  const u = getCurrentUser()
  const headers = { 'Content-Type': 'application/json' }
  if (u?.token) headers['Authorization'] = `Bearer ${u.token}`
  const payload = { approver1: Number(approver1)||0, approver2: Number(approver2)||0, approver3: Number(approver3)||0 }
  const res = await fetch(`${API_BASE}/setting/approvalThresholds`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`保存免审阈值失败(${res.status})`)
  return true
}

// 事由层级：读取与保存
export async function getReasonHierarchy() {
  const res = await fetch(`${API_BASE}/setting/reasonHierarchy`)
  if (!res.ok) throw new Error(`获取事由层级失败(${res.status})`)
  const data = await res.json().catch(() => ({}))
  const arr = Array.isArray(data?.hierarchy) ? data.hierarchy : []
  return arr.map(n => ({ text: String(n.text || ''), level: Number(n.level) || 0 }))
}

export async function setReasonHierarchy(hierarchy = []) {
  const u = getCurrentUser()
  const headers = { 'Content-Type': 'application/json' }
  if (u?.token) headers['Authorization'] = `Bearer ${u.token}`
  const payload = Array.isArray(hierarchy) ? hierarchy.map(n => ({ text: String(n.text || ''), level: Number(n.level)||0 })) : []
  const res = await fetch(`${API_BASE}/setting/reasonHierarchy`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ hierarchy: payload }),
  })
  if (!res.ok) throw new Error(`保存事由层级失败(${res.status})`)
  return true
}
