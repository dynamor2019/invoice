import { getApprovalOrder, getCurrentUser } from './users';
import * as http from './http'

export async function seedBills() {
  const list = await getBills().catch(() => [])
  if (list && list.length > 0) return
  const steps = [...await getApprovalOrder(), 'accountant']
  const sample = [
    { id: '1', title: '差旅报销', amount: 1000, category: '差旅', date: '2025-10-01', createdBy: 'admin', status: 'pending', steps, currentStepIndex: 0, history: [] },
    { id: '2', title: '办公采购', amount: 500, category: '采购', date: '2025-10-02', createdBy: 'approver1', status: 'pending', steps, currentStepIndex: 0, history: [] },
  ]
  for (const b of sample) {
    await http.post('/bill', b)
  }
}

export function getBills() {
  return http.get('/bills')
}

export function getArchivedBills() {
  return http.get('/bills/archived')
}

export function getTodosByRole(role) {
  return http.get(`/todos/${encodeURIComponent(role)}`).catch((e) => {
    console.error('getTodosByRole failed', e)
    return []
  })
}

export async function setBills(bills) {
  // 简化为逐条 upsert
  for (const b of bills) {
    await http.post('/bill', b)
  }
}

export async function createBill({ title, amount, category, date, projectId }) {
  const creator = getCurrentUser();
  const steps = [...await getApprovalOrder(), 'accountant'];
  const payload = {
    title,
    amount: Number(amount || 0),
    category,
    date,
    projectId,
    createdBy: creator?.id || 'admin',
    status: 'pending',
    steps,
    currentStepIndex: 0,
    history: [],
  }
  const saved = await http.post('/bill', payload)
  return saved || payload
}

export async function getTodosForRole(role) {
  const all = await getBills()
  return all.filter(b => b.status === 'pending' && b.steps[b.currentStepIndex] === role)
}

export async function approveBill(id, role) {
  return http.post('/bill/approve', { id, role })
}

export async function rejectBill(id, role, reason = '') {
  return http.post('/bill/reject', { id, role, reason })
}

export async function resubmitBill(id, editorId, updates = {}) {
  return http.post('/bill/resubmit', { id, editorId, updates })
}

export async function getBillById(id) {
  return http.get(`/bill/${id}`).catch(() => null)
}

export async function deleteBill(id) {
  await http.del(`/bill/${encodeURIComponent(id)}`)
  return true
}
