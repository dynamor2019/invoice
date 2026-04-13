import { getReasons } from '../store/reasons'
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
  const [allBills, setAllBills] = useState([]) // 新增：所有票据（用于管理层统计）
  const [reasonItems, setReasonItems] = useState([]) // 新增：报销事由项目（用于统计）
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
      try {
        await seedBills()
        
        // 强制刷新当前用户信息（确保角色最新）
        try {
          const me = await http.get('/me').catch(() => null)
          if (me && me.role) {
            const current = getCurrentUser()
            if (current && current.role !== me.role) {
              console.log('Role mismatch, updating...', current.role, '->', me.role)
              const newUser = { ...current, role: me.role, id: me.id || current.id }
              setCurrentUser(newUser)
              // 触发重载
              window.location.reload()
              return
            }
          }
        } catch (e) {
          console.warn('Refresh user info failed', e)
        }

        const user = getCurrentUser()
        if (user) {
          let todosList = []
          try {
            todosList = await getTodosByRole(user.role)
          } catch (e) {
            console.warn('Load todos failed', e)
          }
          let all = []
          try {
            all = await getBills()
          } catch (e) {
            console.error('Load bills failed', e)
          }
          
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
          setAllBills(all || [])
          setMine((all || []).filter(b => (b.createdBy === user.id) || (b.submitterId === user.id)))

          // 加载报销事由用于统计
          try {
            const cats = await getReasons()
            const items = []
            if (Array.isArray(cats)) {
              cats.forEach(c => {
                if (Array.isArray(c.items)) {
                  c.items.forEach(i => items.push({ ...i, parentCategory: c.name }))
                }
              })
            }
            setReasonItems(items)
          } catch (e) {
            console.warn('Load reasons failed', e)
          }
        }
      } catch (err) {
        console.error('Home init failed', err)
      }
    })()
  }, [])

  // 搜索过滤
  const matches = (b) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      (b.title || '').toLowerCase().includes(q) ||
      (b.category || '').toLowerCase().includes(q) ||
      (b.submitterName || '').toLowerCase().includes(q)
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
    <div className="min-h-screen p-3 md:p-4 space-y-4 md:space-y-6 pb-20">
      {/* 现代化头部 */}
      <div className="modern-card p-4 md:p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <HomeIcon className="text-white" sx={{ fontSize: { xs: 20, md: 24 } }} />
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-800">报销工作台</h1>
              <p className="text-sm md:text-base text-gray-600">欢迎回来，{user?.name} ({getRoleDisplayName(user?.role)})</p>
            </div>
          </div>
          <Link to="/new" className="modern-btn flex items-center gap-1 md:gap-2 text-sm md:text-base">
            <Add sx={{ fontSize: { xs: 14, md: 16 } }} />
            <span className="hidden sm:inline">新建报销单</span>
            <span className="sm:hidden">新建</span>
          </Link>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-3 md:p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs md:text-sm">待我审批</p>
                <p className="text-xl md:text-2xl font-bold">{todoCount}</p>
              </div>
              <Assignment sx={{ fontSize: { xs: 24, md: 32 }, opacity: 0.8 }} />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-3 md:p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs md:text-sm">我的进行中</p>
                <p className="text-xl md:text-2xl font-bold">{myInProgressCount}</p>
              </div>
              <Schedule sx={{ fontSize: { xs: 24, md: 32 }, opacity: 0.8 }} />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-3 md:p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs md:text-sm">我的已完成</p>
                <p className="text-xl md:text-2xl font-bold">{myCompletedCount}</p>
              </div>
              <CheckCircle sx={{ fontSize: { xs: 24, md: 32 }, opacity: 0.8 }} />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-3 md:p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs md:text-sm">待审总额</p>
                <p className="text-lg md:text-xl font-bold">
                  ¥{((() => {
                    const isManager = ['admin', 'chairman', 'vice_chairman', 'gm', 'finance_manager'].includes(user?.role)
                    const source = isManager ? allBills : mine
                    // 仅计算审批中的金额
                    return source
                      .filter(b => {
                        if (b.status !== 'pending') return false
                        if (user?.role === 'gm') {
                           const item = reasonItems.find(i => i.name === b.category)
                           return item?.parentCategory === '工程费用'
                        }
                        if (user?.role === 'vice_chairman') {
                           const item = reasonItems.find(i => i.name === b.category)
                           return item?.parentCategory === '后勤费用'
                        }
                        return true
                      })
                      .reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0)
                  })() / 10000).toFixed(1)}万
                </p>
              </div>
              <AttachMoney sx={{ fontSize: { xs: 24, md: 32 }, opacity: 0.8 }} />
            </div>
          </div>
        </div>

        {/* 财务统计图表 - 仅高级管理层可见 */}
        {(user?.role === 'chairman' || user?.role === 'vice_chairman' || user?.role === 'gm' || user?.role === 'admin' || user?.role === 'finance_manager' || user?.role === 'accountant') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* 报销金额趋势 */}
            <div className="modern-card p-4 md:p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">报销金额分布</h3>
              <div className="space-y-3">
                {['approved', 'pending', 'archived'].map((status, index) => {
                  const statusBills = allBills.filter(bill => bill.status === status)
                  const statusAmount = statusBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0)
                  const totalAmount = allBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0)
                  const percentage = totalAmount > 0 ? (statusAmount / totalAmount * 100) : 0
                  const statusNames = { approved: '已审批', pending: '审批中', archived: '已归档' }
                  const colors = { approved: 'from-green-400 to-green-600', pending: 'from-orange-400 to-orange-600', archived: 'from-gray-400 to-gray-600' }
                  
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{statusNames[status]}</span>
                        <span className="text-xs text-gray-500">¥{(statusAmount / 10000).toFixed(1)}万</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`bg-gradient-to-r ${colors[status]} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 报销类别统计 */}
            <div className="modern-card p-4 md:p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">报销类别统计</h3>
              <div className="space-y-3">
                {(() => {
                  let stats = []
                  if (reasonItems.length > 0) {
                    stats = reasonItems.filter(item => {
                      if (user?.role === 'gm') return item.parentCategory === '工程费用'
                      if (user?.role === 'vice_chairman') return item.parentCategory === '后勤费用'
                      return true
                    }).map(item => {
                      const amount = allBills
                        .filter(b => b.category === item.name)
                        .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)
                      return { name: item.name, amount }
                    })
                  } else {
                    const map = allBills.reduce((acc, bill) => {
                      const category = bill.category || '其他'
                      acc[category] = (acc[category] || 0) + (Number(bill.amount) || 0)
                      return acc
                    }, {})
                    stats = Object.entries(map).map(([name, amount]) => ({ name, amount }))
                  }
                  
                  // 按数据库定义的顺序显示（即八项事由的逻辑顺序），不按金额排序
                  // stats.sort((a, b) => b.amount - a.amount)
                  
                  const totalAmount = allBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0)

                  return stats.map((item, index) => {
                    const percentage = totalAmount > 0 ? (item.amount / totalAmount * 100) : 0
                    const colors = [
                      'from-blue-400 to-blue-600',
                      'from-purple-400 to-purple-600', 
                      'from-pink-400 to-pink-600',
                      'from-indigo-400 to-indigo-600',
                      'from-teal-400 to-teal-600',
                      'from-cyan-400 to-cyan-600',
                      'from-emerald-400 to-emerald-600',
                      'from-rose-400 to-rose-600'
                    ]
                    
                    return (
                      <div key={item.name} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">{item.name}</span>
                          <span className="text-xs text-gray-500">¥{(item.amount / 10000).toFixed(1)}万</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`bg-gradient-to-r ${colors[index % colors.length]} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 搜索栏 */}
      <div className="modern-card p-3 md:p-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="relative">
          <Search sx={{ fontSize: { xs: 18, md: 20 } }} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索报销单标题、类别或提交人..."
            className="modern-input w-full pl-9 md:pl-10 text-sm md:text-base"
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
                          <span>{bill.date}</span>
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
                        <span>{bill.date}</span>
                      </div>
                      {bill.status === 'approved' || bill.status === 'archived' ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle sx={{ fontSize: 14 }} />
                          <span>
                            {(() => {
                              try {
                                const h = Array.isArray(bill.history) ? bill.history : JSON.parse(bill.history || '[]')
                                const last = h.reverse().find(x => x.action === 'approve' || x.action === 'archive')
                                return last ? `完成于 ${new Date(last.time).toLocaleDateString()}` : '已完成'
                              } catch {
                                return '已完成'
                              }
                            })()}
                          </span>
                        </div>
                      ) : null}
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
                    
                    {bill.status !== 'archived' && (
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