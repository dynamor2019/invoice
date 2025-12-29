import { NavLink } from 'react-router-dom'
import { getCurrentUser } from '../store/users'

const linkClass = ({ isActive }) =>
  [
    'flex-1 flex flex-col items-center justify-center py-3 px-2 text-xs select-none transition-all duration-300 relative',
    isActive
      ? 'text-white'
      : 'text-gray-400 hover:text-gray-600'
  ].join(' ')

export default function BottomNav() {
  const user = getCurrentUser()
  
  return (
    <nav className="modern-nav fixed bottom-0 left-0 right-0 z-50">
      <div className="flex relative">
        {/* 基础导航 - 所有非管理员用户 */}
        <NavLink to="/projects" className={linkClass}>
          {({ isActive }) => (
            <>
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl"></div>
              )}
              <div className="relative z-10 flex flex-col items-center">
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="font-medium">项目管理</span>
              </div>
            </>
          )}
        </NavLink>
        
        <NavLink to="/supplier-library" className={linkClass}>
          {({ isActive }) => (
            <>
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl"></div>
              )}
              <div className="relative z-10 flex flex-col items-center">
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="font-medium">供应商库</span>
              </div>
            </>
          )}
        </NavLink>
        
        <NavLink to="/home" className={linkClass}>
          {({ isActive }) => (
            <>
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl"></div>
              )}
              <div className="relative z-10 flex flex-col items-center">
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V3" />
                </svg>
                <span className="font-medium">报销工作台</span>
              </div>
            </>
          )}
        </NavLink>
        
        <NavLink to="/new" className={linkClass}>
          {({ isActive }) => (
            <>
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl"></div>
              )}
              <div className="relative z-10 flex flex-col items-center">
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="font-medium">新建报销单</span>
              </div>
            </>
          )}
        </NavLink>
        
        {/* 会计归档 */}
        {user?.role === 'accountant' && (
          <NavLink to="/archive" className={linkClass}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl"></div>
                )}
                <div className="relative z-10 flex flex-col items-center">
                  <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span className="font-medium">归档</span>
                </div>
              </>
            )}
          </NavLink>
        )}
        
        {/* 管理员功能 */}
        {user?.role === 'admin' && (
          <>
            <NavLink to="/admin" className={linkClass}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl"></div>
                  )}
                  <div className="relative z-10 flex flex-col items-center">
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">管理</span>
                  </div>
                </>
              )}
            </NavLink>
            
            <NavLink to="/stats" className={linkClass}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl"></div>
                  )}
                  <div className="relative z-10 flex flex-col items-center">
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-medium">统计</span>
                  </div>
                </>
              )}
            </NavLink>
          </>
        )}
      </div>
    </nav>
  )
}
