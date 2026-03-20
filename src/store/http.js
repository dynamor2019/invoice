import { getApiBase } from './api'
import { getCurrentUser, setCurrentUser } from './auth-storage'

const API_BASE = getApiBase()

function authHeaders(base = {}) {
  const u = getCurrentUser()
  const token = u?.token
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

async function handleResponse(res) {
  if (res.status === 401) {
    // Token invalid/expired
    setCurrentUser(null)
    window.location.href = '/login'
    throw new Error('登录已过期，请重新登录')
  }

  const txt = await res.text()
  let data = null
  try { data = txt ? JSON.parse(txt) : null } catch { /* ignore */ }
  
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

export async function get(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: authHeaders()
  })
  return handleResponse(res)
}

export async function post(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  })
  return handleResponse(res)
}

export async function put(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  })
  return handleResponse(res)
}

export async function del(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
  return handleResponse(res)
}

export async function getRaw(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: authHeaders()
  })
  if (res.status === 401) {
    setCurrentUser(null)
    window.location.href = '/login'
    throw new Error('登录已过期，请重新登录')
  }
  return res
}

export async function upload(endpoint, formData) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  })
  return handleResponse(res)
}
