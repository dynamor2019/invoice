import { StrictMode } from 'react'
import './index.css'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import App from './App.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import BillDetail from './pages/BillDetail.jsx'
import NewBill from './pages/NewBill.jsx'
import Archive from './pages/Archive.jsx'
import Admin from './pages/Admin.jsx'
import Settings from './pages/Settings.jsx'
import { getCurrentUser, seedUsers } from './store/users'
import Stats from './pages/Stats.jsx'
import HierarchyEditor from './pages/HierarchyEditor.jsx'
 
// WeChat (微信) 内置浏览器检测：为 html 添加标记类（支持 ?wechat=1/0 模拟）
try {
  const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : ''
  let isWeChat = /MicroMessenger/i.test(ua)
  try {
    const qs = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
    if (qs.get('wechat') === '1') isWeChat = true
    if (qs.get('wechat') === '0') isWeChat = false
  } catch {}
  const el = document.documentElement
  if (el) {
    el.classList.remove(isWeChat ? 'non-wechat' : 'wechat')
    el.classList.add(isWeChat ? 'wechat' : 'non-wechat')
  }
} catch { /* ignore */ }

(async () => {
  await seedUsers()
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ThemeProvider theme={createTheme({
        palette: { primary: { main: '#2563eb' } },
        shape: { borderRadius: 8 },
      })}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<App />}> 
            <Route index element={<AuthIndex />} />
            <Route path="home" element={<RequireUser><RequireNonAdmin><Home /></RequireNonAdmin></RequireUser>} />
            {/* 取消单独的审批页面，统一在详情页处理 */}
            <Route path="bill/:id" element={<RequireUser><RequireNonAdmin><BillDetail /></RequireNonAdmin></RequireUser>} />
            <Route path="new" element={<RequireUser><RequireNonAdmin><NewBill /></RequireNonAdmin></RequireUser>} />
            <Route path="archive" element={<RequireUser><RequireAccountant><Archive /></RequireAccountant></RequireUser>} />
            <Route path="settings" element={<RequireUser><Settings /></RequireUser>} />
            <Route path="admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
            <Route path="stats" element={<RequireAdmin><Stats /></RequireAdmin>} />
            <Route path="hierarchy" element={<RequireUser><HierarchyEditor /></RequireUser>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </StrictMode>,
  )
})()

function AuthIndex() {
  const u = getCurrentUser()
  if (!u) return <Navigate to="/login" replace />
  return <Navigate to={u.role === 'admin' ? '/admin' : '/home'} replace />
}

function RequireUser({ children }) {
  const u = getCurrentUser()
  return u ? children : <Navigate to="/login" replace />
}

function RequireAdmin({ children }) {
  const u = getCurrentUser()
  return u?.role === 'admin' ? children : <Navigate to="/login" replace />
}

function RequireNonAdmin({ children }) {
  const u = getCurrentUser()
  return u?.role === 'admin' ? <Navigate to="/admin" replace /> : children
}

function RequireAccountant({ children }) {
  const u = getCurrentUser()
  return u?.role === 'accountant' ? children : <Navigate to="/home" replace />
}
