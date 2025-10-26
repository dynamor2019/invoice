import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '../store/users'
import { seedBills, getTodosByRole, getBills, deleteBill, approveBill } from '../store/bills'
import { getUsers } from '../store/users'
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Drawer from '../components/Drawer'

export default function Home() {
  const user = getCurrentUser()
  const [todos, setTodos] = useState([])
  const [mine, setMine] = useState([])
  const [search, setSearch] = useState('')
  const [mineFilter, setMineFilter] = useState('all')
  const [openIds, setOpenIds] = useState({})
  const [roleNameMap, setRoleNameMap] = useState({})
  const [userNameMap, setUserNameMap] = useState({})
  const [hiddenIds, setHiddenIds] = useState(() => {
    const u = getCurrentUser()
    const key = `fa_hidden_${u?.id || 'unknown'}`
    try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
  })
  // 首页不再使用消息状态

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
        // Fallback: if server endpoint missing or returns error/empty unexpectedly, compute on client
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
          setTodos(computed)
        } else {
          setTodos(todosList)
        }
        // mine list
        setMine(all.filter(b => b.createdBy === user.id))
        try {
          const users = await getUsers()
          const mapRole = {}
          const mapId = {}
          for (const u of users) { mapRole[u.role] = u.name; mapId[u.id] = u.name }
          setRoleNameMap(mapRole)
          setUserNameMap(mapId)
        } catch {}
      }
    })()
  }, [])

  // 仅在 effect 中获取当前用户用于初始化

  const todoCount = todos.length
  const myInProgressCount = mine.filter(b => b.status === 'pending').length
  const myCompletedCount = mine.filter(b => b.status === 'approved' || b.status === 'archived').length

  const matches = (b) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      b.title.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      String(b.id).includes(q) ||
      String(b.amount).includes(q)
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

  const statusText = (s) => {
    if (s === 'pending') return '审批中'
    if (s === 'approved') return '已通过'
    if (s === 'archived') return '已归档'
    if (s === 'rejected') return '已拒绝'
    if (s === 'rejected-modified') return '已拒绝-已修改'
    return s
  }

  const [openGroups, setOpenGroups] = useState({})
  const toggleOpen = (id) => setOpenIds(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleGroup = (key) => setOpenGroups(prev => ({ ...prev, [key]: !(prev[key] ?? true) }))

  // 抽屉状态
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerBill, setDrawerBill] = useState(null)
  const navigate = useNavigate()
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [olderOpen, setOlderOpen] = useState(false)

  const onDeleteMyBill = async (b) => {
    if (!b) return
    try {
      await deleteBill(b.id)
      setMine(prev => prev.filter(x => x.id !== b.id))
      setConfirmDeleteId(null)
      alert('删除成功')
    } catch (e) {
      alert(e?.message || '删除失败')
    }
  }

  // 批量审批进度（不显式“批量审批按钮”，由标题栏小开关触发）
  const [batchProgress, setBatchProgress] = useState({ /* key: { running, total, done, failed } */ })
  const startBatch = async (key) => {
    const list = (groupEntries.find(([k]) => k === key)?.[1]) || []
    const total = list.length
    setBatchProgress(prev => ({ ...prev, [key]: { running: true, total, done: 0, failed: 0 } }))
    try {
      const u = getCurrentUser()
      for (const b of list) {
        const steps = Array.isArray(b.steps) ? b.steps : []
        const idx = Number(b.currentStepIndex) || 0
        if (b.status === 'pending' && steps[idx] === u.role) {
          try {
            await approveBill(b.id, u.role)
            setBatchProgress(prev => ({ ...prev, [key]: { ...prev[key], done: prev[key].done + 1 } }))
          } catch {
            setBatchProgress(prev => ({ ...prev, [key]: { ...prev[key], failed: prev[key].failed + 1 } }))
          }
        } else {
          // 不可审批时当作失败计入
          setBatchProgress(prev => ({ ...prev, [key]: { ...prev[key], failed: prev[key].failed + 1 } }))
        }
      }
      // 刷新列表
      const cu = getCurrentUser()
      const todosList = await getTodosByRole(cu.role)
      setTodos(todosList)
      const all = await getBills()
      setMine(all.filter(x => x.createdBy === cu.id))
    } finally {
      setBatchProgress(prev => ({ ...prev, [key]: { ...prev[key], running: false } }))
      alert('本批次审批已完成（含不可审批的项）')
    }
  }

  const formatMinute = (d) => {
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const getCreateDate = (b) => {
    let hist = Array.isArray(b.history) ? b.history : []
    if (!Array.isArray(hist)) {
      try { hist = JSON.parse(b.history || '[]') } catch { hist = [] }
    }
    const hc = Array.isArray(hist) ? hist.find(h => h && h.action === 'create' && h.time) : null
    if (hc?.time) {
      const d = new Date(hc.time)
      if (!isNaN(d.valueOf())) return d
    }
    let imgs = Array.isArray(b.images) ? b.images : []
    if (!Array.isArray(imgs)) {
      try { imgs = JSON.parse(b.images || '[]') } catch { imgs = [] }
    }
    if (imgs.length > 0) {
      const m = String(imgs[0]).match(/\/(\d+)-/)
      if (m) {
        const t = Number(m[1])
        const d = new Date(t)
        if (!isNaN(d.valueOf())) return d
      }
    }
    return null
  }
  const groupsMap = {}
  for (const b of filteredTodos) {
    const d = getCreateDate(b)
    const minuteStr = d ? formatMinute(d) : '未知时间'
    const key = `${b.createdBy}|${minuteStr}`
    if (!groupsMap[key]) groupsMap[key] = []
    groupsMap[key].push(b)
  }
  const groupEntries = Object.entries(groupsMap)

  // 新增：时间编号（YY-MM-DD-HH-MM）用于显示
  const displayNoOf = (b) => {
    try {
      let hist = Array.isArray(b.history) ? b.history : []
      if (!Array.isArray(hist)) { try { hist = JSON.parse(b.history || '[]') } catch { hist = [] } }
      const t = hist.find(h => h && h.action === 'create' && h.time)?.time
      const pad = (n) => String(n).padStart(2, '0')
      if (t) {
        const d = new Date(t)
        if (!isNaN(d.valueOf())) {
          const yy = String(d.getFullYear()).slice(-2)
          const mm = pad(d.getMonth() + 1)
          const dd = pad(d.getDate())
          const hh = pad(d.getHours())
          const mi = pad(d.getMinutes())
          return `${yy}-${mm}-${dd}-${hh}-${mi}`
        }
      }
      if (b.date) {
        const bd = new Date(b.date)
        const yy = String(bd.getFullYear()).slice(-2)
        const mm = pad(bd.getMonth() + 1)
        const dd = pad(bd.getDate())
        return `${yy}-${mm}-${dd}-00-00`
      }
      return '-'
    } catch { return '-' }
  }

  // 按“本周”和“更早”拆分我发起的票据（支持时间基础切换）
  const [timeBasis, setTimeBasis] = useState('submitted') // 'submitted' | 'bill'
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const nowMs = Date.now()
  const getBillDate = (b) => {
    if (b?.date) {
      const d = new Date(b.date)
      if (!isNaN(d.valueOf())) return d
    }
    return null
  }
  const getBasisDate = (b) => {
    return timeBasis === 'submitted'
      ? (getCreateDate(b) || getBillDate(b))
      : (getBillDate(b) || getCreateDate(b))
  }
  const isInWeek = (b) => {
    const d = getBasisDate(b)
    const t = d ? d.getTime() : 0
    return t > 0 && (nowMs - t) <= WEEK_MS
  }
  const sortByBasisDesc = (a, b) => {
    const ta = getBasisDate(a)?.getTime() || 0
    const tb = getBasisDate(b)?.getTime() || 0
    return tb - ta
  }
  const recentMine = [...filteredMine.filter(isInWeek)].sort(sortByBasisDesc)
  const olderMine = [...filteredMine.filter(b => !isInWeek(b))].sort(sortByBasisDesc)

  // 密码修改功能迁移至设置页面

  const statusStyles = {
    '待办': { card: 'bg-amber-50 border border-amber-200 shadow-sm border-l-4 border-amber-400', title: 'text-amber-700', value: 'text-amber-600' },
    '进行中': { card: 'bg-blue-50 border border-blue-200 shadow-sm border-l-4 border-blue-400', title: 'text-blue-700', value: 'text-blue-600' },
    '已完成': { card: 'bg-green-50 border border-green-200 shadow-sm border-l-4 border-green-400', title: 'text-green-700', value: 'text-green-600' },
  }

return (
  <div className="space-y-[2px]">
    {/* 蓝色科技感头部 */}
    <div className="rounded-xl overflow-hidden">
      <div className="bg-gradient-to-br from-primary to-primary-dark text-white p-5">
        <div className="flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-label="工作台">
            <path d="M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h5v8H3v-8zm7 0h11v8H10v-8z"/>
          </svg>
          <p className="text-xs opacity-90">快捷查看审批与票据进度</p>
        </div>
      </div>
      {/* 状态卡片 */}
      <div className="grid grid-cols-3 gap-[2px] bg-white p-3">
        {[
          { title: '待办', value: todoCount },
          { title: '进行中', value: myInProgressCount },
          { title: '已完成', value: myCompletedCount },
        ].map((s) => (
          <div key={s.title} className={"rounded-lg p-3 " + (statusStyles[s.title]?.card || 'border border-primary/20')}>
            <div className={"text-xs " + (statusStyles[s.title]?.title || 'text-gray-600')}>{s.title}</div>
            <div className={"text-lg font-semibold mt-1 " + (statusStyles[s.title]?.value || 'text-primary')}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>

      {/* 密码修改入口已迁移至“设置”页面 */}

      {/* 搜索与筛选 */}
      <section className="bg-white rounded-lg border p-3">
        <div className="grid grid-cols-2 gap-[2px]">
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
            placeholder="搜索票据（事由/类别/编号/金额）"
          />
          <select value={mineFilter} onChange={e=>setMineFilter(e.target.value)} className="rounded border px-3 py-2 text-sm">
            <option value="all">我发起的：全部</option>
            <option value="pending">我发起的：进行中</option>
            <option value="approved">我发起的：已完成</option>
            <option value="rejected">我发起的：已拒绝</option>
          </select>
        </div>
      </section>

      <section className="bg-white rounded-lg border border-primary/20 p-3">
        <h3 className="text-sm text-gray-700 mb-[2px]">待办审批</h3>
        <div className="space-y-[2px]">
          {groupEntries.map(([key, list]) => {
            const [createdBy, minute] = key.split('|')
            const uname = userNameMap[createdBy] || createdBy
            const open = openGroups[key] ?? true
            // 简化：不再使用批量进度，无自动审批触发
            return (
              <Accordion key={key} expanded={openGroups[key] ?? false} onChange={(_, expanded) => setOpenGroups(prev => ({ ...prev, [key]: expanded }))}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'2px'}}>
                      <span className="font-medium">{uname} 的提交单子</span>
                      <span className="text-xs text-gray-500">提交时间：{minute}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">批次 · 共{list.length}个单据</span>
                    </div>
                    {/* 去掉进入审批页面的链接 */}
                   </div>
                 </AccordionSummary>
                 <AccordionDetails>
                   <div className="space-y-[2px]">
                    {list.map((b) => (
                      <div key={b.id} className="rounded-lg border border-primary/20 p-3 cursor-pointer" onClick={() => navigate('/review', { state: { batchIds: list.map(x => x.id) } })}>
                         <div className="flex justify-between">
                           <span className="font-medium">{b.title} 编号：{displayNoOf(b)}</span>
                           <span className="text-xs text-primary">本单由“{roleNameMap[b.steps[b.currentStepIndex]] || b.steps[b.currentStepIndex]}”审批中</span>
                         </div>
                        <div className="text-xs text-gray-500 mt-[2px]">金额：¥{b.amount.toFixed(2)} · {b.category}</div>
                        {/* 去掉按钮，点击卡片进入审批页面 */}
                       </div>
                     ))}
                   </div>
                 </AccordionDetails>
               </Accordion>
            )
          })}
          {groupEntries.length === 0 && <div className="text-xs text-gray-500">暂无待办</div>}
        </div>
      </section>

      <section className="bg-white rounded-lg border border-primary/20 p-3">
        <div className="flex items-center justify-between mb-[2px]">
          <h3 className="text-sm text-gray-700">我发起的票据（本周内）</h3>
          <div className="flex items-center gap-[2px]">
            <select value={timeBasis} onChange={(e)=>setTimeBasis(e.target.value)} className="text-xs rounded border px-2 py-1">
              <option value="submitted">按提交时间</option>
              <option value="bill">按票据日期</option>
            </select>
            <button onClick={() => setOlderOpen(true)} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
              本周前（{olderMine.length}）
            </button>
          </div>
        </div>
        <div className="space-y-[2px]">
          {recentMine.map((b) => (
            <div key={b.id} className="rounded-lg border border-gray-200">
              <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => toggleOpen(b.id)}>
                <div className="flex items-center gap-[2px]">
                  <span className="text-xs text-gray-500">编号：{displayNoOf(b)}</span>
                  <span className="font-medium">{b.title}</span>
                </div>
                <div className="flex items-center gap-[2px]">
                  <span className={`text-xs ${b.status === 'approved' || b.status === 'archived' ? 'text-green-600' : b.status === 'rejected' ? 'text-red-600' : b.status === 'rejected-modified' ? 'text-orange-600' : 'text-gray-600'}`}>{statusText(b.status)}</span>
                  <span className="text-xs text-gray-500">{openIds[b.id] ? '收起' : '展开'}</span>
                </div>
              </div>
              {openIds[b.id] && (
                <div className="p-3 border-t border-gray-200 text-sm space-y-[2px] bg-white">
                  <div className="text-xs text-gray-600">金额：¥{b.amount.toFixed(2)} · {b.category} · 日期：{b.date}</div>
                  <div className="flex gap-[2px]">
                    <Link to={`/bill/${b.id}`} className="rounded bg-primary text-white px-3 py-1 text-xs">查看详情</Link>
                    {b.status !== 'archived' ? (
                      confirmDeleteId === b.id ? (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteMyBill(b) }} className="rounded bg-red-600 text-white px-3 py-1 text-xs">确认删除</button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }} className="rounded bg-gray-100 text-gray-700 px-3 py-1 text-xs border border-gray-200">取消</button>
                        </>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(b.id) }} className="rounded bg-red-50 text-red-700 px-3 py-1 text-xs border border-red-200">删除</button>
                      )
                    ) : (
                      <span className="text-xs text-gray-400">已归档不可删除</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {recentMine.length === 0 && (
            <div className="text-xs text-gray-500">本周内暂无发起的票据（旧单请打开上方抽屉查看）</div>
          )}
        </div>
      </section>

      {/* 抽屉实例 */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {!drawerBill ? (
          <div className="text-xs text-gray-500">无内容</div>
        ) : (
          <div className="space-y-[2px]">
            <div className="text-sm font-medium">{drawerBill.title}</div>
            <div className="text-xs text-gray-600">编号：{displayNoOf(drawerBill)}</div>
            <div className="text-xs text-gray-600">金额：¥{drawerBill.amount.toFixed(2)}</div>
            <div className="text-xs text-gray-600">分类：{drawerBill.category}</div>
            <div className="text-xs text-gray-600">日期：{drawerBill.date}</div>
            <div className="text-xs text-gray-600">状态：{statusText(drawerBill.status)}</div>
            <div className="text-xs">
              <a href={`#/bill/${drawerBill.id}`} className="text-blue-600">跳转详情页</a>
            </div>
          </div>
        )}
      </Drawer>
      {/* 一周以前的单子抽屉 */}
      <Drawer open={olderOpen} onClose={() => setOlderOpen(false)}>
        <div className="space-y-[2px]">
          {olderMine.length === 0 && (
            <div className="text-xs text-gray-500">暂无一周以前的单子</div>
          )}
          {olderMine.map((b) => (
            <div key={b.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[2px]">
                  <span className="text-xs text-gray-500">编号：{displayNoOf(b)}</span>
                  <span className="font-medium">{b.title}</span>
                </div>
                <span className={`text-xs ${b.status === 'approved' || b.status === 'archived' ? 'text-green-600' : b.status === 'rejected' ? 'text-red-600' : b.status === 'rejected-modified' ? 'text-orange-600' : 'text-gray-600'}`}>{statusText(b.status)}</span>
              </div>
              <div className="mt-[2px] text-xs text-gray-600">金额：¥{b.amount.toFixed(2)} · {b.category} · 日期：{b.date}</div>
              <div className="mt-[2px] flex gap-[2px]">
                <Link to={`/bill/${b.id}`} className="rounded bg-primary text-white px-3 py-1 text-xs">查看详情</Link>
                {b.status !== 'archived' ? (
                  confirmDeleteId === b.id ? (
                    <>
                      <button onClick={() => onDeleteMyBill(b)} className="rounded bg-red-600 text-white px-3 py-1 text-xs">确认删除</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="rounded bg-gray-100 text-gray-700 px-3 py-1 text-xs border border-gray-200">取消</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(b.id)} className="rounded bg-red-50 text-red-700 px-3 py-1 text-xs border border-red-200">删除</button>
                  )
                ) : (
                  <span className="text-xs text-gray-400">已归档不可删除</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Drawer>
      </div>
    )
}