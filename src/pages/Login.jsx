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
    const admin = list.find(u => u.role === 'admin')
    const a1 = list.find(u => u.role === 'approver1')
    const a2 = list.find(u => u.role === 'approver2')
    const a3 = list.find(u => u.role === 'approver3')
    const staffSorted = list.filter(u => u.role === 'staff').sort((x, y) => extractNum(x.id) - extractNum(y.id))
    const prioritized = [admin, a1, a2, a3, ...staffSorted.slice(0, 15)].filter(Boolean)
    const remaining = list.filter(u => !prioritized.includes(u))
    return [...prioritized, ...remaining]
  }

  useEffect(() => {
    (async () => {
      // 若已登录，按角色自动分流，避免误入错误页面
      const cu = getCurrentUser()
      if (cu) {
        navigate(cu.role === 'admin' ? '/admin' : '/home', { replace: true })
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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 px-4 flex items-center justify-center">
      <div className="w-full max-w-sm bg-white/95 backdrop-blur rounded-xl shadow-lg p-5 border border-white/30">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-semibold text-gray-900 text-center">账号登录</h2>
          <p className="text-xs text-gray-500 mt-1 text-center hide-in-wechat">请选择账号并输入密码继续</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">选择账号</label>
            <select
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full rounded-lg border border-primary/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-primary/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="请输入密码"
            />
          </div>
          {msg && <div className="text-xs text-red-600">{msg}</div>}
          <div>
            <button type="submit" className="w-full bg-blue-600 text-white rounded-lg py-2 shadow active:opacity-90">登录</button>
          </div>
        </form>
        <div id="problems_and_diagnostics" className="mt-4 text-xs text-gray-600 border-t border-gray-200 pt-3">
          <h2 className="text-sm font-semibold">诊断信息</h2>
          <p>API 地址：{diag.apiBase}</p>
          <p>服务器连通：{diag.pingOk ? '正常' : '不可用'}</p>
          <p>用户数量：{diag.usersCount ?? '-'}</p>
          <p>管理员存在：{diag.hasAdmin === null ? '-' : (diag.hasAdmin ? '是' : '否')}</p>
          {diag.lastError ? <p className="text-red-600">最近错误：{diag.lastError}</p> : null}
        </div>
      </div>
    </div>
  )
}