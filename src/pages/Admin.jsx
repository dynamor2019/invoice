import { useEffect, useState } from 'react'
import { getUsers, setUsers, getApprovalOrder, setApprovalOrder, getCurrentUser, resetPassword } from '../store/users'
import { getCompanyName, setCompanyName, getApprovalThresholds, setApprovalThresholds } from '../store/settings'
import { useNavigate, Link } from 'react-router-dom'
import { Settings, People, BarChart, Business, Security, AccountCircle } from '@mui/icons-material'

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
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ id: '', name: '', role: 'staff', password: '123456' })
  const [selectedRoles, setSelectedRoles] = useState(new Set())

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
      chairman: '董事长',
      vice_chairman: '副董事长', 
      gm: '总经理',
      project_manager: '项目经理',
      procurement_manager: '采购经理',
      cost_manager: '造价经理',
      finance_manager: '财务经理',
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
      chairman: '最高审批权限',
      vice_chairman: '高级审批权限',
      gm: '总经理审批权限',
      project_manager: '项目管理权限',
      procurement_manager: '采购管理权限',
      cost_manager: '造价管理权限',
      finance_manager: '财务管理权限',
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

  const allRoles = [
    { id: 'admin', label: '管理员' },
    { id: 'chairman', label: '董事长' },
    { id: 'vice_chairman', label: '副董事长' },
    { id: 'gm', label: '总经理' },
    { id: 'project_manager', label: '项目经理' },
    { id: 'procurement_manager', label: '采购经理' },
    { id: 'cost_manager', label: '造价经理' },
    { id: 'finance_manager', label: '财务经理' },
    { id: 'approver1', label: '一级审查' },
    { id: 'approver2', label: '二级审查' },
    { id: 'approver3', label: '三级审查' },
    { id: 'staff', label: '工作人员' },
    { id: 'accountant', label: '会计' },
  ]

  const onAddUser = async () => {
    if (!newUser.id.trim()) {
      alert('请输入用户ID')
      return
    }
    if (!newUser.name.trim()) {
      alert('请输入用户名称')
      return
    }
    if (selectedRoles.size === 0) {
      alert('请至少选择一个角色')
      return
    }

    // 只能添加一个角色的用户
    if (selectedRoles.size > 1) {
      alert('每个用户只能拥有一个角色')
      return
    }

    const role = Array.from(selectedRoles)[0]
    
    // 检查ID是否已存在
    if (users.some(u => u.id === newUser.id)) {
      alert('用户ID已存在')
      return
    }

    try {
      const updatedUsers = [...users, {
        id: newUser.id,
        name: newUser.name,
        role: role,
        password: newUser.password
      }]
      await setUsers(updatedUsers)
      const latest = await getUsers()
      setUsersState(latest)
      const init = {}
      for (const u of latest) init[u.id] = u.name
      setPendingNames(init)
      
      // 重置表单
      setNewUser({ id: '', name: '', role: 'staff', password: '123456' })
      setSelectedRoles(new Set())
      setShowAddUser(false)
      alert('用户添加成功')
    } catch (e) {
      alert(e?.message || '添加用户失败')
    }
  }

  const toggleRole = (roleId) => {
    const newSet = new Set(selectedRoles)
    if (newSet.has(roleId)) {
      newSet.delete(roleId)
    } else {
      newSet.clear()
      newSet.add(roleId)
    }
    setSelectedRoles(newSet)
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* 现代化头部 */}
        <div className="modern-card p-6 mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Settings className="text-white" sx={{ fontSize: 24 }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">管理员控制台</h1>
                <p className="text-gray-600">系统配置与用户管理</p>
              </div>
            </div>
            <Link to="/projects" className="modern-btn">
              返回项目
            </Link>
          </div>

          {/* 现代化标签页 */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'settings' 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Business sx={{ fontSize: 20 }} />
              基本设置
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'users' 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <People sx={{ fontSize: 20 }} />
              用户管理
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'stats' 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <BarChart sx={{ fontSize: 20 }} />
              平台统计
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="space-y-6">
          {activeTab === 'settings' && (
            <>
              {/* 公司设置 */}
              <div className="modern-card p-6 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-4">
                  <Business className="text-blue-500" sx={{ fontSize: 24 }} />
                  <h2 className="text-xl font-semibold text-gray-800">公司设置</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">公司名称</label>
                    <input
                      value={companyName}
                      onChange={e=>setCompanyNameState(e.target.value)}
                      placeholder="请输入公司名称"
                      className="modern-input w-full"
                    />
                    <p className="text-sm text-gray-500 mt-1">将显示在浏览器标题栏</p>
                  </div>
                  <div className="flex items-end">
                    <button onClick={onSaveCompanyName} className="modern-btn">
                      保存设置
                    </button>
                  </div>
                </div>
              </div>

              {/* 审批设置 */}
              <div className="modern-card p-6 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-4">
                  <Security className="text-green-500" sx={{ fontSize: 24 }} />
                  <h2 className="text-xl font-semibold text-gray-800">审批设置</h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 审批优先级 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-3">审批优先级</h3>
                    <div className="space-y-2">
                      {order.map((role, index) => (
                        <div key={role} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </span>
                            <span className="font-medium text-gray-800">
                              {users.find(u => u.role === role)?.name || roleLabel(role)}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => move(role, 'up')} 
                              disabled={index === 0}
                              className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
                            >
                              ↑
                            </button>
                            <button 
                              onClick={() => move(role, 'down')} 
                              disabled={index === order.length - 1}
                              className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 免审阈值 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-3">免审阈值设置</h3>
                    <p className="text-sm text-gray-600 mb-3">设置每级审批在金额低于阈值时跳过该级</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">一级审批阈值（元）</label>
                        <input
                          type="number"
                          min="0"
                          value={thresholds.approver1}
                          onChange={e=>setThresholdsState(prev=>({ ...prev, approver1: Number(e.target.value||0) }))}
                          className="modern-input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">二级审批阈值（元）</label>
                        <input
                          type="number"
                          min="0"
                          value={thresholds.approver2}
                          onChange={e=>setThresholdsState(prev=>({ ...prev, approver2: Number(e.target.value||0) }))}
                          className="modern-input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">三级审批阈值（元）</label>
                        <input
                          type="number"
                          min="0"
                          value={thresholds.approver3}
                          onChange={e=>setThresholdsState(prev=>({ ...prev, approver3: Number(e.target.value||0) }))}
                          className="modern-input w-full"
                        />
                      </div>
                      <button onClick={onSaveThresholds} className="modern-btn w-full">
                        保存阈值设置
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 事由编辑器 */}
              <div className="modern-card p-6 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="text-purple-500" sx={{ fontSize: 24 }} />
                  <h2 className="text-xl font-semibold text-gray-800">事由管理</h2>
                </div>
                <p className="text-gray-600 mb-4">管理报销事由分类和选项</p>
                <HierarchyEditor />
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <div className="modern-card p-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <People className="text-blue-500" sx={{ fontSize: 24 }} />
                  <h2 className="text-xl font-semibold text-gray-800">用户管理</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddUser(true)}
                    className="modern-btn bg-green-500 hover:bg-green-600"
                  >
                    + 增加用户
                  </button>
                  <button
                    onClick={onSaveUsers}
                    disabled={savingUsers}
                    className="modern-btn"
                  >
                    {savingUsers ? '保存中...' : '保存所有修改'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(() => {
                  const num = (id) => {
                    const m = String(id).match(/(\d+)/)
                    return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER
                  }
                  const displayUsers = [
                    users.find(u => u.role === 'admin'),
                    users.find(u => u.role === 'chairman'),
                    users.find(u => u.role === 'vice_chairman'),
                    users.find(u => u.role === 'gm'),
                    users.find(u => u.role === 'project_manager'),
                    users.find(u => u.role === 'procurement_manager'),
                    users.find(u => u.role === 'cost_manager'),
                    users.find(u => u.role === 'finance_manager'),
                    users.find(u => u.role === 'approver1'),
                    users.find(u => u.role === 'approver2'),
                    users.find(u => u.role === 'approver3'),
                    ...users.filter(u => u.role === 'staff')
                      .sort((a, b) => num(a.id) - num(b.id))
                      .slice(0, 15),
                  ].filter(Boolean)
                  
                  return displayUsers.map(u => (
                    <div key={u.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                          <AccountCircle className="text-white" sx={{ fontSize: 20 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate">{pendingNames[u.id] ?? u.name}</div>
                          <div className="text-sm text-gray-500">{roleLabel(u.role)}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-xs text-gray-600">
                          <div>账号: {u.id}</div>
                          <div>权限: {permissionLabel(u.role)}</div>
                        </div>
                        
                        <input
                          value={pendingNames[u.id] ?? u.name}
                          onChange={(e) => onChangeName(u.id, e.target.value)}
                          className="modern-input w-full text-sm"
                          placeholder="用户名称"
                        />
                        
                        <button
                          className="w-full text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                          disabled={u.role === 'admin'}
                          onClick={() => onResetPassword(u.id)}
                        >
                          {u.role === 'admin' ? '管理员账户' : '重置密码'}
                        </button>
                      </div>
                    </div>
                  ))
                })()}
              </div>

              {/* 增加用户对话框 */}
              {showAddUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="modern-card w-full max-w-md p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">增加新用户</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">用户ID *</label>
                        <input
                          type="text"
                          value={newUser.id}
                          onChange={(e) => setNewUser({...newUser, id: e.target.value})}
                          placeholder="如: user01"
                          className="modern-input w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">用户名称 *</label>
                        <input
                          type="text"
                          value={newUser.name}
                          onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                          placeholder="如: 张三"
                          className="modern-input w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">初始密码</label>
                        <input
                          type="text"
                          value={newUser.password}
                          onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                          placeholder="默认: 123456"
                          className="modern-input w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">选择角色 *</label>
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                          {allRoles.map(role => (
                            <label key={role.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedRoles.has(role.id)}
                                onChange={() => toggleRole(role.id)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-gray-700">{role.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <button
                          onClick={onAddUser}
                          className="flex-1 modern-btn bg-green-500 hover:bg-green-600"
                        >
                          确认添加
                        </button>
                        <button
                          onClick={() => {
                            setShowAddUser(false)
                            setNewUser({ id: '', name: '', role: 'staff', password: '123456' })
                            setSelectedRoles(new Set())
                          }}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="modern-card p-6 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-6">
                <BarChart className="text-green-500" sx={{ fontSize: 24 }} />
                <h2 className="text-xl font-semibold text-gray-800">平台统计</h2>
              </div>
              <Stats embedded />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}