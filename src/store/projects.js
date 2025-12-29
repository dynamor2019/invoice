import { getApiBase } from './api'
import { getCurrentUser } from './users'
const API_BASE = getApiBase()

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

export async function listProjects() {
  const res = await fetch(`${API_BASE}/projects`, { headers: authHeaders() })
  return handleJson(res)
}

export async function createProject(formData) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })
  return handleJson(res)
}

export async function updateProject(id, formData) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: formData,
  })
  return handleJson(res)
}

export async function deleteProject(id) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return handleJson(res)
}

export async function uploadProjectAttachments(id, files) {
  const fd = new FormData()
  for (const f of files) fd.append('files', f)
  const res = await fetch(`${API_BASE}/projects/${id}/attachments`, {
    method: 'POST',
    headers: authHeaders(),
    body: fd,
  })
  return handleJson(res)
}

export async function listMaterials(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/materials`, { headers: authHeaders() })
  return handleJson(res)
}

export async function addMaterial(projectId, m) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/materials`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(m),
  })
  return handleJson(res)
}

export async function updateMaterial(projectId, materialId, m) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/materials/${materialId}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(m),
  })
  return handleJson(res)
}

export async function deleteMaterial(projectId, materialId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/materials/${materialId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return handleJson(res)
}

export async function deleteMaterialsBatch(projectId, ids) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/materials/batch-delete`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ids }),
  })
  return handleJson(res)
}

export async function listMaterialCategories(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/material-categories`, { headers: authHeaders() })
  return handleJson(res)
}

export async function addMaterialCategory(projectId, payload) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/material-categories`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  return handleJson(res)
}

export async function listSuppliers() {
  const res = await fetch(`${API_BASE}/suppliers`, { headers: authHeaders() })
  return handleJson(res)
}

export async function addSupplier(s) {
  const res = await fetch(`${API_BASE}/suppliers`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(s),
  })
  return handleJson(res)
}

export async function importMaterialsBatch(projectId, rows) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/materials/import`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ rows }),
  })
  return handleJson(res)
}

export async function exportMaterialsCsv(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/materials/export`, { headers: authHeaders() })
  const txt = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return txt
}

export async function exportMaterialsXlsx(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/materials/export-xlsx`, { headers: authHeaders() })
  const contentType = res.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    const err = await handleJson(res) // Will throw if error
    return err 
  }
  if (contentType && contentType.includes('text/html')) {
    const text = await res.text()
    console.error('Export failed: Server returned HTML instead of Excel', text.substring(0, 200))
    throw new Error('导出失败：服务器返回了网页而非Excel文件，请联系管理员')
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.blob()
}
export async function searchMaterials(query) {
  const res = await fetch(`${API_BASE}/materials/search?q=${encodeURIComponent(query)}`, { headers: authHeaders() })
  return handleJson(res)
}
