import * as http from './http'

export async function getCompanyName() {
  const data = await http.get('/setting/companyName').catch(() => ({}))
  return String(data.companyName || '')
}

export async function setCompanyName(name) {
  await http.put('/setting/companyName', { companyName: String(name || '').slice(0, 100) })
  return true
}

// 审批免审阈值设置
export async function getApprovalThresholds() {
  const data = await http.get('/setting/approvalThresholds').catch(() => ({}))
  return {
    approver1: Number(data.approver1) || 0,
    approver2: Number(data.approver2) || 0,
    approver3: Number(data.approver3) || 0,
  }
}

export async function setApprovalThresholds({ approver1 = 0, approver2 = 0, approver3 = 0 }) {
  const payload = { approver1: Number(approver1)||0, approver2: Number(approver2)||0, approver3: Number(approver3)||0 }
  await http.put('/setting/approvalThresholds', payload)
  return true
}

// 事由层级（用于 HierarchyEditor）
export async function getReasonHierarchy() {
  const data = await http.get('/setting/reasonHierarchy').catch(() => ({}))
  return Array.isArray(data.hierarchy) ? data.hierarchy : []
}

export async function setReasonHierarchy(hierarchy) {
  await http.put('/setting/reasonHierarchy', { hierarchy })
  return true
}
