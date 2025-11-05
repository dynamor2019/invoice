import { useEffect, useState } from 'react'
import { getUsers, setUsers, getApprovalOrder, setApprovalOrder, getCurrentUser, resetPassword } from '../store/users'
import { getCompanyName, setCompanyName, getApprovalThresholds, setApprovalThresholds } from '../store/settings'
import { useNavigate, Link } from 'react-router-dom'

import Stats from './Stats'
import HierarchyEditor from './HierarchyEditor'

export default function Admin() {
  const navigate = useNavigate()
  const [users, setUsersState] = useState([])
  const [pendingNames, setPendingNames] = useState({})
  const [savingUsers, setSavingUsers] = useState(false)
  const [order, setOrder] = useState([])
  const [companyName, setCompanyNameState] = useState('')
  const [thresholds, setThresholdsState] = useState({ approver1: 0, approver2: 0, approver3: 0 })
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
      const init = {}
      for (const u of list) init[u.id] = u.name
      setPendingNames(init)
      const ord = await getApprovalOrder()
      setOrder(ord)
      try {
        const cn = await getCompanyName()
        setCompanyNameState(cn)
      } catch {}
      try {
        const t = await getApprovalThresholds()
        setThresholdsState(t)
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

  const onChangeName = (id, name) => {
    setPendingNames(prev => ({ ...prev, [id]: name }))
  }

  const onSaveUsers = async () => {
    const next = users.map(u => ({ ...u, name: String(pendingNames[u.id] ?? u.name) }))
    setSavingUsers(true)
    try {
      await setUsers(next)
      const latest = await getUsers()
      setUsersState(latest)
      const init = {}
      for (const u of latest) init[u.id] = u.name
      setPendingNames(init)
      alert('用户信息已保存')
    } catch (e) {
      alert(e?.message || '更新用户失败')
    } finally {
      setSavingUsers(false)
    }
  }

  const roleLabel = (role) => {
    const map = {
      admin: '管理员',
      approver1: '一级审查',
      approver2: '二级审查',
      approver3: '三级审查',
      staff: '工作人员',
      accountant: '会计',
    }
    return map[role] || role
  }

  const permissionLabel = (role) => {
    const map = {
      admin: '系统管理权限',
      approver1: '审批权限（一级）',
      approver2: '审批权限（二级）',
      approver3: '审批权限（三级）',
      staff: '报销提交权限',
      accountant: '记账与归档权限',
    }
    return map[role] || '—'
  }

  const onSaveCompanyName = async () => {
    try {
      await setCompanyName(companyName)
      alert('公司名称已保存')
    } catch (e) {
      alert(e?.message || '保存失败')
    }
  }

  const onSaveThresholds = async () => {
    try {
      await setApprovalThresholds(thresholds)
      alert('免审阈值已保存')
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
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={companyName}
              onChange={e=>setCompanyNameState(e.target.value)}
              placeholder="请输入公司名称（将显示在浏览器标题栏）"
              className="min-w-0 w-full sm:flex-1 rounded border border-primary/30 px-3 py-2 text-sm"
            />
            <button onClick={onSaveCompanyName} className="w-full sm:w-auto px-3 py-2 rounded bg-primary text-black text-sm font-semibold">保存</button>
          </div>
        </section>
        <section className="mb-6 bg-green-100 border border-green-300 rounded-lg p-3 shadow-sm border-l-4 border-green-400">
          <h3 className="text-sm font-medium text-gray-700 mb-2">审批优先级</h3>
          <ul className="space-y-2">
            {order.map(role => (
              <li key={role} className="flex flex-wrap items-center justify-between rounded-lg border border-primary/20 px-3 py-2 gap-2">
                <span className="text-gray-800 flex-1 min-w-0">
                  {users.find(u => u.role === role)?.name || role}
                </span>
                <div className="flex gap-2 w-full sm:w-auto sm:justify-end">
                  <button onClick={() => move(role, 'up')} className="px-2 py-1 rounded bg-white border border-primary/30">上移</button>
                  <button onClick={() => move(role, 'down')} className="px-2 py-1 rounded bg-white border border-primary/30">下移</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-6 bg-purple-100 border border-purple-300 rounded-lg p-3 shadow-sm border-l-4 border-purple-400">
          <h3 className="text-sm font-medium text-gray-700 mb-2">免审阈值（单位：元）</h3>
          <p className="text-xs text-gray-600 mb-2">设置每级审批在金额低于阈值时跳过该级，直接进入会计。</p>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="w-full sm:w-24 text-xs text-gray-700">一级审批</label>
              <input
                type="number"
                min="0"
                value={thresholds.approver1}
                onChange={e=>setThresholdsState(prev=>({ ...prev, approver1: Number(e.target.value||0) }))}
                className="min-w-0 w-full sm:flex-1 rounded border border-primary/30 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="w-full sm:w-24 text-xs text-gray-700">二级审批</label>
              <input
                type="number"
                min="0"
                value={thresholds.approver2}
                onChange={e=>setThresholdsState(prev=>({ ...prev, approver2: Number(e.target.value||0) }))}
                className="min-w-0 w-full sm:flex-1 rounded border border-primary/30 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="w-full sm:w-24 text-xs text-gray-700">三级审批</label>
              <input
                type="number"
                min="0"
                value={thresholds.approver3}
                onChange={e=>setThresholdsState(prev=>({ ...prev, approver3: Number(e.target.value||0) }))}
                className="min-w-0 w-full sm:flex-1 rounded border border-primary/30 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end mt-2">
              <button onClick={onSaveThresholds} className="px-3 py-2 rounded bg-primary text-black text-sm font-semibold">保存阈值</button>
            </div>
          </div>
        </section>

        {/* 层级结构编辑器（替换原有展示形式，逻辑保持一致） */}
        <section className="mb-6 bg-orange-100 border border-orange-300 rounded-lg p-3 shadow-sm border-l-4 border-orange-400">
        <h3 className="text-sm font-medium text-black mb-2">事由编辑器</h3>
        <p className="text-black mb-2">外部“+”新增同级（插入至子集之后），内部“+”新增子级，“−”删除当前项。</p>
          <div className="mt-2">
            <HierarchyEditor />
          </div>
        </section>

        <section className="bg-amber-100 border border-amber-300 rounded-lg p-3 shadow-sm border-l-4 border-amber-400">
          <h3 className="text-sm font-medium text-gray-700 mb-2">账户管理（并列显示）</h3>
          <div className="space-y-2">
            {(() => {
              const num = (id) => {
                const m = String(id).match(/(\d+)/)
                return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER
              }
              const displayUsers = [
                users.find(u => u.role === 'admin'),
                users.find(u => u.role === 'approver1'),
                users.find(u => u.role === 'approver2'),
                users.find(u => u.role === 'approver3'),
                ...users.filter(u => u.role === 'staff')
                  .sort((a, b) => num(a.id) - num(b.id))
                  .slice(0, 15),
              ].filter(Boolean)
              return displayUsers.map(u => (
                <div key={u.id} className="rounded-lg border border-primary/20 px-3 py-2 space-y-2">
                  <div className="min-w-0">
                    <div className="text-gray-800">{pendingNames[u.id] ?? u.name}</div>
                    <div className="text-xs text-gray-500">
                      账号：{u.id} · 角色：{roleLabel(u.role)} · 权限：{permissionLabel(u.role)} · 状态：启用
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={pendingNames[u.id] ?? u.name}
                      onChange={(e) => onChangeName(u.id, e.target.value)}
                      className="w-full sm:w-64 rounded border border-primary/30 px-2 py-1 text-sm"
                    />
                    <button
                      className="text-xs bg-white border border-primary/30 px-2 py-1 rounded"
                      disabled={u.role === 'admin'}
                      onClick={() => onResetPassword(u.id)}
                    >重置密码</button>
                  </div>
                </div>
              ))
            })()}
            <div className="flex justify-end mt-2">
              <button
                onClick={onSaveUsers}
                disabled={savingUsers}
                className="text-sm px-3 py-2 rounded bg-primary text-black border border-primary/40"
              >{savingUsers ? '保存中…' : '保存修改'}</button>
            </div>
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