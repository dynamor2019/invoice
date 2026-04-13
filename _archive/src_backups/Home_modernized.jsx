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
import { 
  Home as HomeIcon, 
  Assignment, 
  CheckCircle, 
  Schedule, 
  Search,
  Add,
  Visibility,
  Delete,
  AttachMoney,
  Person,
  CalendarToday,
  TrendingUp
} from '@mui/icons-material'

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

  const onDeleteMyBill = async (b) => {
    if (!b) return
    try {
      await deleteBill(b.id)
      const all = await getBills()
      setMine((all || []).filter(x => x.submitterId === user.id))
    } catch (e) {
      alert(e?.message || '删除失败')
    }
  }

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'admin': '管理员',
      'chairman': '董事长',
      'vice_chairman': '副董事长',
      'gm': '总经理',
      'project_manager': '项目经理',
      'procurement_manager': '采购经理',
      'cost_manager': '造价经理',
      'finance_manager': '财务经理',
      'approver1': '一级审批',
      'approver2': '二级审批',
      'approver3': '三级审批',
      'staff': '员工',
      'accountant': '会计'
    }
    return roleMap[role] || role
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { text: '待审批', class: 'badge-warning' },
      'approved': { text: '已通过', class: 'badge-success' },
      'rejected': { text: '已拒绝', class: 'badge-danger' },
      'archived': { text: '已归档', class: 'badge-info' }
    }
    const config = statusMap[status] || { text: status, class: 'badge-info' }
    return (
      <span className={`modern-badge ${config.class}`}>
        {config.text}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 space-y-6 pb-20">
      {/* 现代化头部 */}
      <div className="modern-card p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <HomeIcon className="text-white" sx={{ fontSize: 24 }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">报销工作台</h1>
              <p className="text-gray-600">欢迎回来，{user?.name} ({getRoleDisplayName(user?.role)})</p>
            </div>
          </div>
          <Link to="/new" className="modern-btn flex items-center gap-2">
            <Add sx={{ fontSize: 16 }} />
            新建报销单
          </Link>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">待我审批</p>
                <p className="text-2xl font-bold">{todoCount}</p>
              </div>
              <Assignment sx={{ fontSize: 32, opacity: 0.8 }} />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">我的进行中</p>
                <p className="text-2xl font-bold">{myInProgressCount}</p>
              </div>
              <Schedule sx={{ fontSize: 32, opacity: 0.8 }} />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">我的已完成</p>
                <p className="text-2xl font-bold">{myCompletedCount}</p>
              </div>
              <CheckCircle sx={{ fontSize: 32, opacity: 0.8 }} />
            </div>
          </div>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="modern-card p-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="relative">
          <Search sx={{ fontSize: 20 }} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索报销单标题、类别或提交人..."
            className="modern-input w-full pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 待审批列表 */}
      {todoCount > 0 && (
        <div className="modern-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <Assignment className="text-blue-500" sx={{ fontSize: 24 }} />
              <h2 className="text-xl font-bold text-gray-800">待我审批 ({filteredTodos.length})</h2>
            </div>
          </div>
          
          <div className="divide-y">
            {filteredTodos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Search sx={{ fontSize: 48, opacity: 0.3 }} className="mx-auto mb-2" />
                <p>没有找到匹配的待审批项目</p>
              </div>
            ) : (
              filteredTodos.map((bill, index) => (
                <div key={bill.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-800">{bill.title}</h3>
                        {getStatusBadge(bill.status)}
                        <span className="text-sm text-gray-500">
                          {bill.category}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Person sx={{ fontSize: 14 }} />
                          <span>{bill.submitterName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AttachMoney sx={{ fontSize: 14 }} />
                          <span>¥{Number(bill.amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CalendarToday sx={{ fontSize: 14 }} />
                          <span>{new Date(bill.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Link 
                      to={`/bill/${bill.id}`}
                      className="modern-btn flex items-center gap-2"
                    >
                      <Visibility sx={{ fontSize: 16 }} />
                      审批
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 我的报销单 */}
      <div className="modern-card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-green-500" sx={{ fontSize: 24 }} />
              <h2 className="text-xl font-bold text-gray-800">我的报销单</h2>
            </div>
            
            {/* 筛选按钮 */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: '全部', count: mine.length },
                { key: 'pending', label: '进行中', count: myInProgressCount },
                { key: 'approved', label: '已完成', count: myCompletedCount }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setMineFilter(filter.key)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    mineFilter === filter.key
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="divide-y">
          {filteredMine.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Assignment sx={{ fontSize: 48, opacity: 0.3 }} className="mx-auto mb-2" />
              <p>暂无报销单记录</p>
              <Link to="/new" className="modern-btn mt-4 inline-flex items-center gap-2">
                <Add sx={{ fontSize: 16 }} />
                创建第一个报销单
              </Link>
            </div>
          ) : (
            filteredMine.map((bill, index) => (
              <div key={bill.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-800">{bill.title}</h3>
                      {getStatusBadge(bill.status)}
                      <span className="text-sm text-gray-500">
                        {bill.category}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <AttachMoney sx={{ fontSize: 14 }} />
                        <span>¥{Number(bill.amount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarToday sx={{ fontSize: 14 }} />
                        <span>{new Date(bill.createdAt).toLocaleDateString()}</span>
                      </div>
                      {bill.approvedAt && (
                        <div className="flex items-center gap-1">
                          <CheckCircle sx={{ fontSize: 14 }} />
                          <span>完成于 {new Date(bill.approvedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link 
                      to={`/bill/${bill.id}`}
                      className="modern-btn-secondary flex items-center gap-2"
                    >
                      <Visibility sx={{ fontSize: 16 }} />
                      查看
                    </Link>
                    
                    {bill.status === 'draft' && (
                      <button
                        onClick={() => onDeleteMyBill(bill)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}