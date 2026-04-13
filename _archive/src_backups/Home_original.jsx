import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '../store/users'
import { seedBills, getTodosByRole, getBills, deleteBill, approveBill } from '../store/bills'
import { getUsers, getApprovalOrder } from '../store/users'
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Drawer from '../components/Drawer'
import { getApiBase, getApiHost } from '../store/api'
import { getApprovalThresholds } from '../store/settings'
import { Home as HomeIcon, Assignment, CheckCircle, Schedule, Search } from '@mui/icons-material'

export default function Home() {
  const user = getCurrentUser()
  const [todos, setTodos] = useState([])
  const [mine, setMine] = useState([])
  const [search, setSearch] = useState('')
  const [mineFilter, setMineFilter] = useState('all')
  const [openIds, setOpenIds] = useState({})
  const [roleNameMap, setRoleNameMap] = useState({})
  const [userNameMap, setUserNameMap] = useState({})
  const [roleAccountLabelMap, setRoleAccountLabelMap] = useState({})
  const [hiddenIds, setHiddenIds] = useState(() => {
    const u = getCurrentUser()
    const key = `fa_hidden_${u?.id || 'unknown'}`
    try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
  })

  // 状态统计
  const todoCount = todos.length
  const myInProgressCount = mine.filter(b => b.status === 'pending').length
  const myCompletedCount = mine.filter(b => ['approved', 'archived'].includes(b.status)).length

  useEffect(() => {
    (async () => {
      await seedBills()
      const user = getCurrentUser()
      if (user) {
        let todosList = []
        try {
          todosList = await getTodosByRole(user.role)
        } catch {}
        const all = await getBills()
        
        if (!Array.isArray(todosList) || (todosList.length === 0 && Array.isArray(all) && all.length > 0)) {
          const role = user.role
          const computed = (all || []).filter(b => {
            if (!b || b.status !== 'pending') return false
            let steps = b.steps
            if (typeof steps === 'string') {
              try { steps = JSON.parse(steps) } catch { steps = [] }
            }
            if (!Array.isArray(steps)) steps = []
            const idx = Number(b.currentStepIndex) || 0
            return steps[idx] === role
          })
          todosList = computed
        }
        setTodos(todosList || [])
        setMine((all || []).filter(b => b.submitterId === user.id))
      }
    })()
  }, [])

  // 搜索过滤
  const matches = (b) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      b.title.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      b.submitterName?.toLowerCase().includes(q)
    )
  }

  const filteredTodos = todos.filter(matches)
  const filteredMine = mine.filter(b => !hiddenIds.includes(b.id)).filter(b => {
    if (mineFilter === 'all') return matches(b)
    if (mineFilter === 'pending') return b.status === 'pending' && matches(b)
    if (mineFilter === 'approved') return (b.status === 'approved' || b.status === 'archived') && matches(b)
    if (mineFilter === 'rejected') return b.status === 'rejected' && matches(b)
    return matches(b)
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 space-y-6">
      {/* 现代化头部 */}
      <div className="modern-card p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <HomeIcon className="text-white" sx={{ fontSize: 24 }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">报销工作台</h1>
              <p className="text-gray-600">欢迎回来，{user?.name}</p>
            </div>
          </div>
          <Link to="/new" className="modern-btn">
            + 新建报销单
          </Link>
        </div>

        {/* 状态卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { title: '待办', value: todoCount, color: 'from-orange-400 to-red-500', icon: Assignment },
            { title: '进行中', value: myInProgressCount, color: 'from-blue-400 to-purple-500', icon: Schedule },
            { title: '已完成', value: myCompletedCount, color: 'from-green-400 to-teal-500', icon: CheckCircle },
          ].map((s) => (
            <div key={s.title} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">{s.title}</div>
                <s.icon className="text-gray-400" sx={{ fontSize: 20 }} />
              </div>
              <div className={`text-2xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* 搜索与筛选 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" sx={{ fontSize: 20 }} />
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              className="modern-input pl-10 w-full"
              placeholder="搜索报销单..."
            />
          </div>
          <select
            value={mineFilter}
            onChange={e=>setMineFilter(e.target.value)}
            className="modern-input"
          >
            <option value="all">全部状态</option>
            <option value="pending">进行中</option>
            <option value="approved">已完成</option>
            <option value="rejected">已拒绝</option>
          </select>
        </div>
      </div>

      {/* 待办事项 */}
      {filteredTodos.length > 0 && (
        <div className="modern-card p-6 animate-fade-in-up">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Assignment className="text-blue-500" />
            待办事项 ({filteredTodos.length})
          </h2>
          <div className="space-y-3">
            {filteredTodos.map(bill => (
              <Link
                key={bill.id}
                to={`/bill/${bill.id}`}
                className="block bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{bill.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{bill.category} • ¥{bill.amount}</p>
                    <p className="text-xs text-gray-500 mt-1">提交人：{bill.submitterName}</p>
                  </div>
                  <div className="text-right">
                    <span className="modern-badge badge-warning">待审批</span>
                    <p className="text-xs text-gray-500 mt-1">{new Date(bill.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 我的报销单 */}
      <div className="modern-card p-6 animate-fade-in-up">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Schedule className="text-green-500" />
          我的报销单 ({filteredMine.length})
        </h2>
        {filteredMine.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Assignment sx={{ fontSize: 48, opacity: 0.3 }} />
            <p className="mt-2">暂无报销单</p>
            <Link to="/new" className="modern-btn mt-4 inline-block">
              创建第一个报销单
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMine.map(bill => (
              <Link
                key={bill.id}
                to={`/bill/${bill.id}`}
                className="block bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{bill.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{bill.category} • ¥{bill.amount}</p>
                  </div>
                  <div className="text-right">
                    <span className={`modern-badge ${
                      bill.status === 'pending' ? 'badge-warning' :
                      bill.status === 'approved' || bill.status === 'archived' ? 'badge-success' :
                      'badge-danger'
                    }`}>
                      {bill.status === 'pending' ? '审批中' :
                       bill.status === 'approved' || bill.status === 'archived' ? '已完成' :
                       '已拒绝'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{new Date(bill.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}