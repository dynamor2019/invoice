import { StrictMode } from 'react'
import './index.css'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import BillDetail from './pages/BillDetail.jsx'
import NewBill from './pages/NewBill.jsx'
import Archive from './pages/Archive.jsx'
import Admin from './pages/Admin.jsx'
import Settings from './pages/Settings.jsx'
import { getCurrentUser, seedUsers } from './store/users'
import Review from './pages/Review.jsx'
import Stats from './pages/Stats.jsx'
 
(async () => {
  await seedUsers()
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<App />}>
            <Route index element={<AuthIndex />} />
            <Route path="home" element={<RequireUser><RequireNonAdmin><Home /></RequireNonAdmin></RequireUser>} />
            <Route path="review" element={<RequireUser><RequireNonAdmin><Review /></RequireNonAdmin></RequireUser>} />
            <Route path="bill/:id" element={<RequireUser><RequireNonAdmin><BillDetail /></RequireNonAdmin></RequireUser>} />
            <Route path="new" element={<RequireUser><RequireNonAdmin><NewBill /></RequireNonAdmin></RequireUser>} />
            <Route path="archive" element={<RequireUser><RequireAccountant><Archive /></RequireAccountant></RequireUser>} />
            <Route path="settings" element={<RequireUser><Settings /></RequireUser>} />
            <Route path="admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
            <Route path="stats" element={<RequireAdmin><Stats /></RequireAdmin>} />
          </Route>
        </Routes>
      </BrowserRouter>
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
