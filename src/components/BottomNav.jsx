import { NavLink } from 'react-router-dom'
import { getCurrentUser } from '../store/users'

const linkClass = ({ isActive }) =>
  [
    'flex-1 text-center text-xs select-none transition-all',
    isActive
      ? 'py-2 text-primary font-semibold bg-gray-100 shadow-inner rounded-t-md translate-y-[1px]'
      : 'py-2 text-gray-600 hover:text-gray-800'
  ].join(' ')

export default function BottomNav() {
  const user = getCurrentUser()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="flex px-2">
        <NavLink to="/home" className={linkClass}>工作台</NavLink>
        <NavLink to="/new" className={linkClass}>新建票据</NavLink>
        {user?.role === 'accountant' && (
          <NavLink to="/archive" className={linkClass}>归档</NavLink>
        )}
        {user?.role === 'admin' && (
          <>
            <NavLink to="/admin" className={linkClass}>管理</NavLink>
            <NavLink to="/stats" className={linkClass}>统计</NavLink>
          </>
        )}
      </div>
    </nav>
  )
}