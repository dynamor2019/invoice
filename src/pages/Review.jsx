import { useEffect, useState } from 'react'
import { getCurrentUser, getUsers } from '../store/users'
import { getTodosByRole, approveBill, rejectBill } from '../store/bills'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Review() {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedId = location?.state?.billId
  const batchIds = location?.state?.batchIds
  const user = getCurrentUser()
  const [roleNameMap, setRoleNameMap] = useState({})
  const [userNameMap, setUserNameMap] = useState({})
  const [todos, setTodos] = useState([])
  const [approvals, setApprovals] = useState({}) // id -> boolean (true=approve)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [viewerSrc, setViewerSrc] = useState('')

  const API_BASE = (import.meta?.env?.VITE_API_BASE) || '/api'
  const API_HOST = API_BASE.replace(/\/api$/, '')

  useEffect(() => {
    (async () => {
      if (!user || user.role === 'admin') {
        navigate(user?.role === 'admin' ? '/admin' : '/login', { replace: true })
        return
      }
      try {
        const users = await getUsers().catch(() => [])
        const idMap = {}
        const roleMap = {}
        for (const u of users) {
          idMap[u.id] = u.name || u.id
          roleMap[u.role] = u.name || u.role
        }
        setUserNameMap(idMap)
        setRoleNameMap(roleMap)
      } catch {}
      try {
        const list = await getTodosByRole(user.role)
        let finalList = list
        if (Array.isArray(batchIds) && batchIds.length > 0) {
          finalList = list.filter(b => batchIds.includes(b.id))
        } else if (selectedId) {
          finalList = list.filter(b => String(b.id) === String(selectedId))
        }
        setTodos(finalList)
      } catch (e) {
        setMsg(e?.message || '获取待办失败')
      } finally {
        setLoading(false)
      }
    })()
  }, [navigate])

  const toggleApprove = (id) => setApprovals(d => ({ ...d, [id]: !d[id] }))

  const onSubmit = async () => {
    const ids = (Array.isArray(batchIds) && batchIds.length > 0) ? batchIds : todos.map(b => b.id)
    if (ids.length === 0) {
      alert('暂无待提交的票据')
      return
    }
    setSubmitting(true)
    setMsg('')
    let ok = 0, fail = 0
    for (const id of ids) {
      try {
        if (approvals[id]) {
          await approveBill(id, user.role)
        } else {
          await rejectBill(id, user.role, '')
        }
        ok++
      } catch (e) {
        fail++
      }
    }
    setSubmitting(false)
    setMsg(`提交完成：成功 ${ok} 条，失败 ${fail} 条（2秒后返回首页）`)
    // 刷新列表（但仍按批次或selectedId过滤）
    try {
      const list = await getTodosByRole(user.role)
      let finalList = list
      if (Array.isArray(batchIds) && batchIds.length > 0) {
        finalList = list.filter(b => batchIds.includes(b.id))
      } else if (selectedId) {
        finalList = list.filter(b => String(b.id) === String(selectedId))
      }
      setTodos(finalList)
      setApprovals({})
    } catch {}
    setTimeout(() => {
      navigate('/home')
    }, 2000)
  }

  const displayNoOf = (b) => {
    try {
      const d = new Date(b.date)
      const pad = (n) => String(n).padStart(2, '0')
      const yy = String(d.getFullYear()).slice(-2)
      const mm = pad(d.getMonth() + 1)
      const dd = pad(d.getDate())
      return `${yy}-${mm}-${dd}-${String(b.id).slice(-4)}`
    } catch { return String(b.id) }
  }

  const normalizeImages = (b) => {
    try {
      const imgs = Array.isArray(b.images) ? b.images : JSON.parse(b.images || '[]')
      return Array.isArray(imgs) ? imgs : []
    } catch { return [] }
  }

  const hasAnyApproved = Object.values(approvals).some(Boolean)

  return (
    <div className="space-y-6">
      {/* 统一头部样式 */}
      <div className="rounded-xl overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary-dark text-white p-5">
          <div className="text-center">
            <h2 className="text-xl font-semibold">审批中心（批次）</h2>
            <p className="text-xs mt-1 opacity-90">为每条单据勾选“通过”，未勾选视为不通过</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-gray-500">加载中...</div>
      ) : (
        <>
          {todos.length === 0 ? (
            <section className="bg-white rounded-lg border border-primary/20 p-3">
              <div className="text-xs text-gray-500">暂无待办</div>
            </section>
          ) : (
            <section className="bg-white rounded-lg border border-primary/20 p-3">
              <h3 className="text-sm text-gray-700 mb-2">本批次 {todos.length} 条</h3>
              <div className="space-y-2">
                {todos.map(b => {
                  const imgs = normalizeImages(b)
                  return (
                    <div key={b.id} className="rounded-lg border border-primary/20 p-3 bg-white">
                      <div className="flex gap-3 justify-between">
                        {/* 左侧文字与操作 */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">编号：{displayNoOf(b)}</span>
                              <span className="font-medium">{b.title}</span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">事由：{b.title}</div>
                          <div className="text-xs text-gray-600 mt-1">金额：¥{Number(b.amount||0).toFixed(2)} · 类别：{b.category} · 日期：{b.date || '-'}</div>
                          <div className="text-xs text-gray-600 mt-1">当前步骤：{roleNameMap[b.steps?.[b.currentStepIndex]] || b.steps?.[b.currentStepIndex] || '-'}</div>
                          <div className="text-xs text-gray-600 mt-1">发起人：{userNameMap[b.createdBy] || b.createdBy}</div>
                          <div className="mt-2">
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={!!approvals[b.id]} onChange={() => setApprovals(d => ({ ...d, [b.id]: !d[b.id] }))} /> 通过（未勾选视为不通过）
                            </label>
                          </div>
                        </div>
                        {/* 右侧缩略图 */}
                        {imgs.length > 0 ? (
                          <div className="w-40 shrink-0">
                            <div className="text-xs text-gray-700 mb-1">附件图片</div>
                            <div className="grid grid-cols-2 gap-2">
                              {imgs.slice(0,4).map((img, idx) => (
                                <img
                                  key={idx}
                                  src={`${API_HOST}${img}`}
                                  alt={`票据图片${idx+1}`}
                                  className="w-full h-20 object-cover rounded border cursor-zoom-in"
                                  onClick={() => setViewerSrc(`${API_HOST}${img}`)}
                                />
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
          {(todos.length > 0 && (hasAnyApproved || submitting || !!msg)) && (
            <section className="bg-white rounded-lg border border-primary/20 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">{msg}</div>
                <button
                  disabled={submitting || !hasAnyApproved}
                  onClick={onSubmit}
                  className={`px-3 py-1 rounded font-medium ${submitting || !hasAnyApproved ? 'bg-gray-300 text-gray-700' : 'bg-primary text-black hover:bg-primary-dark'}`}
                >{submitting ? '提交中...' : '提交'}</button>
              </div>
            </section>
          )}
        </>
      )}

      {viewerSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setViewerSrc('')}>
          <div className="absolute inset-0 bg-black/70" />
          <img src={viewerSrc} alt="放大预览" className="relative max-w-[92vw] max-h-[88vh] rounded shadow-2xl" />
        </div>
      )}
    </div>
  )
}