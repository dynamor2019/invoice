// 后端数据库改为 Express + sqlite3，仅当前登录态使用 localStorage
import * as http from './http'
export { getCurrentUser, setCurrentUser } from './auth-storage'

export const defaultUsers = [
  { id: 'admin', name: '管理员', role: 'admin', password: 'admin123' },
  { id: 'approver1', name: '一级审核', role: 'approver1', password: '123456' },
  { id: 'approver2', name: '二级审核', role: 'approver2', password: '123456' },
  { id: 'approver3', name: '三级审核', role: 'approver3', password: '123456' },
  // 工作人员（可由管理员修改姓名）
  { id: 'user01', name: '用户1', role: 'staff', password: '123456' },
  { id: 'user02', name: '用户2', role: 'staff', password: '123456' },
  { id: 'user03', name: '用户3', role: 'staff', password: '123456' },
  { id: 'user04', name: '用户4', role: 'staff', password: '123456' },
  { id: 'user05', name: '用户5', role: 'staff', password: '123456' },
  { id: 'user06', name: '用户6', role: 'staff', password: '123456' },
  { id: 'user07', name: '用户7', role: 'staff', password: '123456' },
  { id: 'user08', name: '用户8', role: 'staff', password: '123456' },
  { id: 'user09', name: '用户9', role: 'staff', password: '123456' },
  { id: 'user10', name: '用户10', role: 'staff', password: '123456' },
  { id: 'user11', name: '用户11', role: 'staff', password: '123456' },
  { id: 'user12', name: '用户12', role: 'staff', password: '123456' },
  { id: 'user13', name: '用户13', role: 'staff', password: '123456' },
  { id: 'user14', name: '用户14', role: 'staff', password: '123456' },
  { id: 'user15', name: '用户15', role: 'staff', password: '123456' },
  { id: 'accountant', name: '会计', role: 'accountant', password: '123456' },
];

export async function seedUsers() {
  // 后端会自动完成种子数据初始化；若列表为空则写入默认用户
  try {
    await http.getRaw('/ping')
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
  return http.get('/users').catch(() => [])
}

export async function setUsers(users) {
  return http.put('/users', { users }).then(() => true)
}

export function getApprovalOrder() {
  return http.get('/approval-order')
}

export async function setApprovalOrder(order) {
  return http.post('/approval-order', { order }).then(() => true)
}

export async function validateLogin(id, password) {
  return http.post('/login', { id, password }).catch(() => null)
}

export async function resetPassword(id) {
  return http.post('/user/reset-password', { id })
}

export async function changePassword(id, oldPassword, newPassword) {
  return http.post('/user/change-password', { id, oldPassword, newPassword })
}
