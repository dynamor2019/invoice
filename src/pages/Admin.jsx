import { useEffect, useState } from 'react'
import { getUsers, setUsers, getApprovalOrder, setApprovalOrder, getCurrentUser, resetPassword } from '../store/users'
import { getCompanyName, setCompanyName } from '../store/settings'
import { useNavigate, Link } from 'react-router-dom'

import Stats from './Stats'

export default function Admin() {
  const navigate = useNavigate()
  const [users, setUsersState] = useState([])
  const [order, setOrder] = useState([])
  const [companyName, setCompanyNameState] = useState('')
  const [activeTab, setActiveTab] = useState('settings')

  useEffect(() => {
    (async () => {
      const current = getCurrentUser()
      if (!current || current.role !== 'admin') {
        navigate('/login')
        return
      }
      const list = await getUsers()
      setUsersState(list)
      const ord = await getApprovalOrder()
      setOrder(ord)
      try {
        const cn = await getCompanyName()
        setCompanyNameState(cn)
      } catch {}
    })()
  }, [navigate])

  const move = (role, dir) => {
    const idx = order.indexOf(role)
    if (idx < 0) return
    const newOrder = [...order]
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= newOrder.length) return
    ;[newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]]
    setOrder(newOrder)
    setApprovalOrder(newOrder)
  }

  const onResetPassword = async (id) => {
    try {
      await resetPassword(id)
      const list = await getUsers()
      setUsersState(list)
      alert('密码已重置为默认值')
    } catch (e) {
      alert(e.message || '重置失败')
    }
  }

  const renameUser = async (id, name) => {
    const next = users.map(u => (u.id === id ? { ...u, name } : u))
    await setUsers(next)
    setUsersState(next)
  }

  const roleLabel = (role) => {
    const map = {
      admin: '管理员',
      approver1: '一级审查',
      approver2: '二级审查',
      approver3: '三级审查',
      approver4: '四级审查',
      approver5: '五级审查',
      accountant: '会计',
    }
    return map[role] || role
  }

  const onSaveCompanyName = async () => {
    try {
      await setCompanyName(companyName)
      alert('公司名称已保存')
    } catch (e) {
      alert(e?.message || '保存失败')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark p-4">
      <div className="max-w-xl mx-auto bg-white/95 backdrop-blur rounded-xl shadow-lg border border-white/30">
        <div className="p-4 border-b border-primary/20 text-center">
          <h2 className="text-xl font-semibold text-gray-900 text-center">管理员控制台</h2>
          <p className="text-xs text-gray-500 mt-1 text-center">统一审批顺序与用户管理</p>
          {/* 顶部页签：与 Home 一致的小型并排按钮 */}
          <div className="mt-2 flex justify-center">
            <div className="inline-flex rounded-lg border border-primary/30 bg-white overflow-hidden">
              <button
                onClick={() => setActiveTab('settings')}
                className={(activeTab === 'settings' ? 'bg-primary text-black' : 'bg-white text-gray-700') + ' text-xs px-3 py-2'}
              >基本设置</button>
              <button
                onClick={() => setActiveTab('stats')}
                className={(activeTab === 'stats' ? 'bg-primary text-black' : 'bg-white text-gray-700') + ' text-xs px-3 py-2 border-l border-primary/30'}
              >平台统计</button>
            </div>
          </div>
        </div>
        <div className="p-4">
        {activeTab === 'settings' && (
        <>
        <section className="mb-6 bg-blue-100 border border-blue-300 rounded-lg p-3 shadow-sm border-l-4 border-blue-400">
          <h3 className="text-sm font-medium text-gray-700 mb-2">公司名称</h3>
          <div className="flex items-center gap-2">
            <input
              value={companyName}
              onChange={e=>setCompanyNameState(e.target.value)}
              placeholder="请输入公司名称（将显示在浏览器标题栏）"
              className="flex-1 rounded border border-primary/30 px-3 py-2 text-sm"
            />
            <button onClick={onSaveCompanyName} className="px-3 py-2 rounded bg-primary text-black text-sm font-semibold">保存</button>
          </div>
        </section>
        <section className="mb-6 bg-green-100 border border-green-300 rounded-lg p-3 shadow-sm border-l-4 border-green-400">
          <h3 className="text-sm font-medium text-gray-700 mb-2">审批优先级</h3>
          <ul className="space-y-2">
            {order.map(role => (
              <li key={role} className="flex items-center justify-between rounded-lg border border-primary/20 px-3 py-2">
                <span className="text-gray-800">
                  {users.find(u => u.role === role)?.name || role}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => move(role, 'up')} className="px-2 py-1 rounded bg-white border border-primary/30">上移</button>
                  <button onClick={() => move(role, 'down')} className="px-2 py-1 rounded bg-white border border-primary/30">下移</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-amber-100 border border-amber-300 rounded-lg p-3 shadow-sm border-l-4 border-amber-400">
          <h3 className="text-sm font-medium text-gray-700 mb-2">账户管理</h3>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-primary/20 px-3 py-2 gap-2">
                <div>
                  <div className="text-gray-800">{u.name}</div>
                  <div className="text-xs text-gray-500">角色：{roleLabel(u.role)} · 账号：{u.id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={u.name}
                    onChange={(e) => renameUser(u.id, e.target.value)}
                    className="rounded border border-primary/30 px-2 py-1 text-sm"
                  />
                  <button
                    className="text-xs bg-white border border-primary/30 px-2 py-1 rounded"
                    disabled={u.role === 'admin'}
                    onClick={() => onResetPassword(u.id)}
                  >重置密码</button>
                </div>
              </div>
            ))}
          </div>
        </section>
        </>
        )}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <Stats embedded />
          </div>
        )}
        </div>
      </div>
    </div>
  )
}