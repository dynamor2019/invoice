import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { seedUsers, getUsers, setCurrentUser, validateLogin, getCurrentUser } from '../store/users'

export default function Login() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  // 登录页仅保留登录逻辑
  const [msg, setMsg] = useState('')
  const [diag, setDiag] = useState({
    apiBase: (import.meta?.env?.VITE_API_BASE) || '/api',
    pingOk: false,
    usersCount: null,
    hasAdmin: null,
    lastError: ''
  })

  const extractNum = (id) => {
    const m = String(id).match(/(\d+)/)
    return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER
  }

  const orderUsers = (list) => {
    if (!Array.isArray(list)) return []
    
    // 按照指定顺序排列用户
    const admin = list.find(u => u.role === 'admin')
    const chairman = list.find(u => u.role === 'chairman')        // 李总
    const viceChairman = list.find(u => u.role === 'vice_chairman') // 孙总
    const gm = list.find(u => u.role === 'gm')                   // 李长春
    const pm = list.find(u => u.role === 'project_manager')      // 项目经理
    const proc = list.find(u => u.role === 'procurement_manager') // 采购经理
    const cost = list.find(u => u.role === 'cost_manager')       // 造价经理
    const finance = list.find(u => u.role === 'finance_manager') // 财务经理
    
    // 其他用户按原来的逻辑排序
    const staffSorted = list.filter(u => u.role === 'staff').sort((x, y) => extractNum(x.id) - extractNum(y.id))
    
    // 按指定顺序组合，并去重
    const prioritized = [admin, chairman, viceChairman, gm, pm, proc, cost, finance, ...staffSorted.slice(0, 15)].filter(Boolean)
    const prioritizedIds = new Set(prioritized.map(u => u.id))
    const remaining = list.filter(u => !prioritizedIds.has(u.id))
    return [...prioritized, ...remaining]
  }

  useEffect(() => {
    (async () => {
      // 若已登录，按角色自动分流，避免误入错误页面
      const cu = getCurrentUser()
      if (cu) {
        navigate(cu.role === 'admin' ? '/admin' : '/projects', { replace: true })
        return
      }
      try {
        await seedUsers()
        setDiag(d => ({ ...d, pingOk: true }))
      } catch {
        setDiag(d => ({ ...d, pingOk: false }))
      }
      try {
        const list = await getUsers()
        const ordered = orderUsers(list)
        setUsers(ordered)
        setId(ordered[0]?.id || '')
        setDiag(d => ({
          ...d,
          usersCount: Array.isArray(list) ? list.length : 0,
          hasAdmin: Array.isArray(list) ? list.some(u => u.id === 'admin') : false
        }))
      } catch (e) {
        setDiag(d => ({ ...d, usersCount: 0, hasAdmin: false, lastError: e?.message || '获取用户失败' }))
      }
    })()
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    try {
      const user = await validateLogin(id, (password || '').trim())
      if (!user) {
        setMsg('账号或密码错误')
        setDiag(d => ({ ...d, lastError: '401 未授权：账号或密码错误' }))
        return
      }
      setCurrentUser(user)
      navigate(user.role === 'admin' ? '/admin' : '/home', { replace: true })
    } catch (err) {
      setMsg('服务器连接失败，请检查后端服务')
      setDiag(d => ({ ...d, lastError: err?.message || '网络错误或服务器不可用' }))
    }
  }

  // 密码修改逻辑已迁移至设置页面

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 px-4 flex items-center justify-center relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="modern-card w-full max-w-md p-8 animate-fade-in-up relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">项目管理系统</h2>
          <p className="text-gray-600 text-sm">请选择账号并输入密码登录</p>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">选择账号</label>
            <select
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="modern-input w-full"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="modern-input w-full"
              placeholder="请输入密码"
            />
          </div>
          
          {msg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {msg}
            </div>
          )}
          
          <button type="submit" className="modern-btn w-full">
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              登录系统
            </span>
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            系统状态
          </h3>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between items-center">
              <span>API 地址</span>
              <span className="font-mono text-blue-600">{diag.apiBase}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>服务器连通</span>
              <span className={`modern-badge ${diag.pingOk ? 'badge-success' : 'badge-danger'}`}>
                {diag.pingOk ? '正常' : '不可用'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>用户数量</span>
              <span className="font-semibold">{diag.usersCount ?? '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>管理员存在</span>
              <span className={`modern-badge ${diag.hasAdmin ? 'badge-success' : 'badge-warning'}`}>
                {diag.hasAdmin === null ? '-' : (diag.hasAdmin ? '是' : '否')}
              </span>
            </div>
            {diag.lastError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-xs">
                  <span className="font-semibold">错误：</span>{diag.lastError}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}