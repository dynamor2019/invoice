import { useEffect, useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import BottomNav from './components/BottomNav.jsx'
import { getCurrentUser, setCurrentUser } from './store/users'
import { getCompanyName } from './store/settings'

function App() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [companyName, setCompanyName] = useState('')
  const defaultTitle = '汉德威票据审核'
  const sanitizeTitle = (name) => {
    const n = String(name || '').trim()
    if (!n) return defaultTitle
    // 如果看起来是 IP:PORT 或纯 IP，则使用默认标题，避免浏览器标题显示 IP
    const isIp = /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?$/.test(n)
    return isIp ? defaultTitle : n
  }
  const onLogout = () => {
    setCurrentUser(null)
    navigate('/login')
  }
  useEffect(() => {
    (async () => {
      try {
        const name = await getCompanyName()
        setCompanyName(name)
        try {
          const el = document.documentElement
          const inWeChat = el && el.classList.contains('wechat')
          const safe = sanitizeTitle(name)
          document.title = inWeChat ? safe : (safe || defaultTitle)
        } catch {
          document.title = sanitizeTitle(name)
        }
      } catch {}
    })()
  }, [])
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-600 to-blue-900">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-white/30" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-center hide-in-wechat">
            <h1 className="text-lg font-semibold">{sanitizeTitle(companyName)}</h1>
          </div>
          <div className="mt-1 text-sm text-gray-600 text-right">
            {user ? (
              <span>
                当前用户：{user.name}
                <Link to="/settings" className="ml-3 text-blue-600">修改密码</Link>
                <button onClick={onLogout} className="ml-3 text-red-600">退出</button>
              </span>
            ) : (
              <Link to="/login" className="text-primary">去登录</Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-white/30 bg-white/80 backdrop-blur">
        <div className="px-4 py-2 text-center text-xs text-gray-600">v0.1</div>
      </footer>
      {user?.role !== 'admin' && <BottomNav />}
    </div>
  )
}

export default App
