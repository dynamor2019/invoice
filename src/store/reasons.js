import * as http from './http'

export async function getReasons() {
  return http.get('/reasons')
}

export async function createReasonCategory({ name, sort = 0 }) {
  return http.post('/reasons/category', { name, sort })
}

export async function updateReasonCategory(id, { name, sort, status }) {
  return http.put(`/reasons/category/${id}`, { name, sort, status })
}

export async function deleteReasonCategory(id) {
  return http.del(`/reasons/category/${id}`)
}

export async function createReasonItem({ categoryId, name, sort = 0 }) {
  return http.post('/reasons/item', { categoryId, name, sort })
}

export async function updateReasonItem(id, { name, sort, status }) {
  return http.put(`/reasons/item/${id}`, { name, sort, status })
}

export async function deleteReasonItem(id) {
  return http.del(`/reasons/item/${id}`)
}

export async function reorderCategories(ids) {
  return http.post('/reasons/category/reorder', { ids })
}

export async function reorderItems(categoryId, ids) {
  return http.post('/reasons/item/reorder', { categoryId, ids })
}

export function findDefaultSelection(reasons) {
  // 默认选择："其他" 分类下的 "未分类" 项
  const cat = reasons.find(c => String(c.name) === '其他') || reasons[0]
  if (!cat) return null
  const item = cat.items.find(i => String(i.name) === '未分类') || cat.items[0]
  return item ? { categoryId: cat.id, itemId: item.id } : null
}
