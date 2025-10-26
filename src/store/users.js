// 后端数据库改为 Express + sqlite3，仅当前登录态使用 localStorage
const CURRENT_USER_KEY = 'fa_current_user';
const API_BASE = (import.meta?.env?.VITE_API_BASE) || '/api'

function authHeaders(base = {}) {
  const u = getCurrentUser()
  const token = u?.token
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

export const defaultUsers = [
  { id: 'admin', name: '管理员', role: 'admin', password: 'admin123' },
  { id: 'approver1', name: '一级审核', role: 'approver1', password: '123456' },
  { id: 'approver2', name: '二级审核', role: 'approver2', password: '123456' },
  { id: 'approver3', name: '三级审核', role: 'approver3', password: '123456' },
  { id: 'approver4', name: '四级审核', role: 'approver4', password: '123456' },
  { id: 'approver5', name: '五级审核', role: 'approver5', password: '123456' },
  { id: 'accountant', name: '会计', role: 'accountant', password: '123456' },
];

export async function seedUsers() {
  // 后端会自动完成种子数据初始化；若列表为空则写入默认用户
  try {
    await fetch(`${API_BASE}/ping`)
    let list = []
    try {
      list = await getUsers()
    } catch {}
    if (!Array.isArray(list) || list.length === 0) {
      try {
        await setUsers(defaultUsers)
      } catch (e) {
        console.warn('写入默认用户失败：', e?.message || e)
      }
    }
  } catch (e) {
    console.warn('后端未启动，用户数据无法从服务器读取')
  }
}

export function getUsers() {
  return fetch(`${API_BASE}/users`).then(async (r) => {
    if (!r.ok) return []
    const txt = await r.text().catch(() => '')
    if (!txt) return []
    try { return JSON.parse(txt) } catch { return [] }
  })
}

export async function setUsers(users) {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ users })
  })
  if (!res.ok) throw new Error('更新用户失败')
  return true
}

export function getCurrentUser() {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function setCurrentUser(user) {
  if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(CURRENT_USER_KEY);
}

export function getApprovalOrder() {
  return fetch(`${API_BASE}/approval-order`).then(r => r.json())
}

export async function setApprovalOrder(order) {
  const res = await fetch(`${API_BASE}/approval-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order })
  })
  if (!res.ok) throw new Error('保存审批顺序失败')
  return true
}

export async function validateLogin(id, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password })
  })
  if (!res.ok) return null
  return res.json()
}

export async function changePassword(id, oldPassword, newPassword) {
  const res = await fetch(`${API_BASE}/user/change-password`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id, oldPassword, newPassword })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '修改失败')
  }
  return true
}

export async function resetPassword(id) {
  const res = await fetch(`${API_BASE}/user/reset-password`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '重置失败')
  }
  return true
}