import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBillById, approveBill, rejectBill, resubmitBill } from '../store/bills'
import { getCurrentUser, getUsers } from '../store/users'

export default function BillDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bill, setBill] = useState(null)
  const [reason, setReason] = useState('')
  const [edit, setEdit] = useState({ title: '', amount: '', category: '', date: '' })
  const [resubmitFiles, setResubmitFiles] = useState([])
  const [viewerSrc, setViewerSrc] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const firstEditableRef = useRef(null)
  const API_BASE = (import.meta?.env?.VITE_API_BASE) || '/api'
  const API_HOST = API_BASE.replace(/\/api$/, '')
  const user = getCurrentUser()
  const [roleNameMap, setRoleNameMap] = useState({})

  useEffect(() => {
    (async () => {
      const b = await getBillById(id)
      if (b) {
        // Normalize fields defensively in case backend normalization isn't active
        let steps = Array.isArray(b.steps) ? b.steps : (() => { try { return JSON.parse(b.steps || '[]') } catch { return [] } })()
        let history = Array.isArray(b.history) ? b.history : (() => { try { return JSON.parse(b.history || '[]') } catch { return [] } })()
        let images = Array.isArray(b.images) ? b.images : (() => { try { return JSON.parse(b.images || '[]') } catch { return [] } })()
        const amount = Number(b.amount) || 0
        const currentStepIndex = Number(b.currentStepIndex) || 0
        setBill({ ...b, steps, history, images, amount, currentStepIndex })
        setEdit({ title: b.title, amount: String(amount), category: b.category, date: b.date })
      } else {
        setBill(null)
      }
      try {
        const users = await getUsers()
        const map = {}
        for (const u of users) map[u.role] = u.name
        setRoleNameMap(map)
      } catch {}
    })()
  }, [id])

  useEffect(() => {
    if (isEditing && firstEditableRef.current) {
      try { firstEditableRef.current.focus() } catch {}
    }
  }, [isEditing])

  if (!bill) {
    return <div className="text-sm text-gray-600">票据不存在</div>
  }

  const curSteps = Array.isArray(bill.steps) ? bill.steps : []
  const curIdx = Number(bill.currentStepIndex) || 0
  const canAct = bill.status === 'pending' && user && curSteps[curIdx] === user.role
  const isAccountantFinal = curSteps[curIdx] === 'accountant'

  // 新增：基于创建时间生成时间编号（YY-MM-DD-HH-MM）
  const displayNo = (() => {
    try {
      const t = (Array.isArray(bill.history) ? bill.history : []).find(h => h.action === 'create')?.time
      const d = t ? new Date(t) : null
      const pad = (n) => String(n).padStart(2, '0')
      if (d && !isNaN(d.getTime())) {
        const yy = String(d.getFullYear()).slice(-2)
        const mm = pad(d.getMonth() + 1)
        const dd = pad(d.getDate())
        const hh = pad(d.getHours())
        const mi = pad(d.getMinutes())
        return `${yy}-${mm}-${dd}-${hh}-${mi}`
      }
      // 回退：使用票据日期（无时分信息，用 00-00 补齐）
      if (bill.date) {
        const bd = new Date(bill.date)
        const yy = String(bd.getFullYear()).slice(-2)
        const mm = pad(bd.getMonth() + 1)
        const dd = pad(bd.getDate())
        return `${yy}-${mm}-${dd}-00-00`
      }
      return '-'
    } catch { return '-' }
  })()

  const onApprove = async () => {
    try {
      // verify server-side role matches required role
      const u = getCurrentUser()
      const headers = u?.token ? { Authorization: `Bearer ${u.token}` } : {}
      const meRes = await fetch(`${API_BASE.replace(/\/$/,'')}/me`, { headers })
      if (meRes.ok) {
        const me = await meRes.json().catch(()=>({}))
        const required = curSteps[curIdx]
        if (me?.role && required && me.role !== required) {
          alert(`当前登录角色为 “${me.role}”，但该票据需要 “${required}” 审批。请使用对应账号登录后再试。`)
          return
        }
      }
      const requiredRole = curSteps[curIdx]
      const updated = await approveBill(bill.id, requiredRole)
      setBill(updated)
      if (updated.status === 'archived' && user.role === 'accountant') {
        navigate('/archive')
      } else {
        navigate('/home')
      }
    } catch (e) {
      const required = curSteps[curIdx]
      alert(e?.message || `审批失败。请确认已使用 “${required}” 账号登录。`)
    }
  }

  const onReject = async () => {
    try {
      const requiredRole = curSteps[curIdx]
      const updated = await rejectBill(bill.id, requiredRole, reason)
      setBill(updated)
      navigate('/home')
    } catch (e) {
      alert(e.message)
    }
  }

  const canResubmit = bill.status === 'rejected' && user && user.id === bill.createdBy &&
    (bill.history.slice().reverse().find(h => h.action === 'reject')?.role === 'approver1')

  const onResubmit = async (e) => {
    e.preventDefault()
    try {
      const newBill = await resubmitBill(bill.id, user.id, {
        title: edit.title,
        amount: edit.amount,
        category: edit.category,
        date: edit.date,
      })
      // 上传重新提交的图片（可选）至新票据ID
      if (resubmitFiles && resubmitFiles.length > 0) {
        const fd = new FormData()
        for (const f of resubmitFiles) fd.append('images', f)
        const u = getCurrentUser()
        const headers = u?.token ? { Authorization: `Bearer ${u.token}` } : {}
        const res = await fetch(`${API_BASE}/bill/${newBill.id}/upload`, { method: 'POST', headers, body: fd })
        if (res.ok) {
          const data = await res.json().catch(()=>({}))
          newBill.images = data.images || []
        }
      }
      // 更新旧票据状态显示与跳转
      setIsEditing(false)
      navigate('/home')
    } catch (e) {
      alert(e.message)
    }
  }
  return (
    <div className="space-y-[2px]">
      <div className="rounded-xl overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary-dark text-white p-4 text-center">
          <h2 className="text-base font-semibold text-center">票据详情 编号：{displayNo}</h2>
          <p className="text-xs mt-[2px] opacity-90 text-center">查看票据信息与执行审批操作</p>
          {canResubmit && !isEditing && (
            <div className="mt-[2px] flex justify-center">
              <button onClick={() => setIsEditing(true)} className="bg-primary hover:bg-primary-dark text-white rounded px-3 py-2 text-xs">修改并重新提交</button>
            </div>
          )}
        </div>
      </div>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700">
        提示：本系统支持多级回退。高等级拒绝会将票据回退到前一审批级别，逐级重新通过；一级拒绝则直接终止至“已拒绝”。
      </div>
      <section className="bg-white rounded-lg border border-primary/20 p-3">
        <div className="flex gap-[2px]">
          <div className="flex-1 space-y-[2px]">
            <div className="text-sm">金额：¥{bill.amount.toFixed(2)}</div>
            <div className="text-sm">事由：{bill.title}</div>
            <div className="text-sm">日期：{bill.date}</div>
            <div className="text-sm">分类：{bill.category}</div>
            <div className="text-sm">状态：{bill.status === 'pending' ? '审批中' : bill.status === 'approved' ? '已通过' : bill.status === 'archived' ? '已归档' : bill.status === 'rejected' ? '已拒绝' : bill.status === 'rejected-modified' ? '已拒绝-已修改' : bill.status}</div>
            {bill.status === 'pending' && (
              <div className="text-sm">本单由“{roleNameMap[curSteps[curIdx]] || curSteps[curIdx]}”审批中</div>
            )}
            <div className="text-xs text-gray-600">当前登录角色：{user?.role || '未知'} · 所需审批角色：{curSteps[curIdx] || '未知'}</div>
            {(() => {
              const lastReject = bill.history.slice().reverse().find(h => h.action === 'reject' && h.demoteTo)
              return lastReject ? (
                <div className="text-xs text-orange-600">已回退至：{lastReject.demoteTo} 待审</div>
              ) : null
            })()}
          </div>
          {Array.isArray(bill.images) && bill.images.length > 0 && (
            <div className="w-40 shrink-0">
              <div className="text-xs text-gray-700 mb-[2px]">附件图片</div>
              <div className="grid grid-cols-2 gap-[2px]">
                {bill.images.map((img, idx) => (
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
          )}
        </div>
      </section>

      <section className="bg-white rounded-lg border border-primary/20 p-3 space-y-[2px]">
        <h3 className="text-sm text-gray-700">审批记录</h3>
        <div className="rounded-lg border border-primary/20 p-3 text-sm text-gray-700 space-y-[2px] bg-white">
          {bill.history.length === 0 && <div className="text-xs text-gray-500">暂无记录</div>}
          {bill.history.map((h, i) => (
            <div key={i} className="space-y-[2px]">
              <div className="flex justify-between">
                <span>{h.role ? h.role : (h.action === 'create' ? '系统' : '用户')} · {h.action === 'approve' ? '通过' : h.action === 'reject' ? '拒绝' : h.action === 'create' ? '创建' : h.action === 'modified' ? '已修改' : h.action === 'resubmit_from' ? '从旧记录重提' : h.action}</span>
                <span className="text-xs text-gray-500">{new Date(h.time).toLocaleString()}</span>
              </div>
              {h.action === 'reject' && (
                <div className="text-xs text-gray-600">
                  {h.reason ? `理由：${h.reason}` : '无理由'}{h.demoteTo ? ` · 回退至：${h.demoteTo}` : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {canAct ? (
        <section className="bg-white rounded-lg border border-primary/20 p-3 space-y-[2px]">
          <div>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="拒绝理由（可选）"
            />
          </div>
          <div className="flex gap-[2px]">
            <button onClick={onApprove} className="flex-1 bg-green-600 text-white rounded-lg py-2">{isAccountantFinal ? '通过并归档' : '通过'}</button>
            <button onClick={onReject} className="flex-1 bg-red-600 text-white rounded-lg py-2">拒绝</button>
          </div>
        </section>
      ) : (
        <div className="text-xs text-gray-500">当前用户不可进行本票据的审批操作</div>
      )}

      {canResubmit && isEditing && (
        <section className="bg-white rounded-lg border border-primary/20 p-3 space-y-[2px]">
          <h3 className="text-sm text-gray-700">编辑模式：修改并重新提交</h3>
          <form onSubmit={onResubmit} className="space-y-[2px]">
            <div className="grid grid-cols-2 gap-[2px]">
              <div>
                <label className="block text-xs text-gray-600 mb-[2px]">事由</label>
                <input ref={firstEditableRef} value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})} className="w-full rounded border px-2 py-1" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-[2px]">金额</label>
                <input type="number" value={edit.amount} onChange={e=>setEdit({...edit,amount:e.target.value})} className="w-full rounded border px-2 py-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-[2px]">
              <div>
                <label className="block text-xs text-gray-600 mb-[2px]">类别</label>
                <input value={edit.category} onChange={e=>setEdit({...edit,category:e.target.value})} className="w-full rounded border px-2 py-1" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-[2px]">日期</label>
                <input type="date" value={edit.date} onChange={e=>setEdit({...edit,date:e.target.value})} className="w-full rounded border px-2 py-1" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-[2px]">重新上传附件（可多选）</label>
              <input type="file" accept="image/*" multiple onChange={e=>setResubmitFiles(Array.from(e.target.files||[]))} />
              <div className="text-xs text-gray-500 mt-[2px]">再次提交成功后，图片将关联到新的申请记录</div>
            </div>
            <div className="flex gap-[2px]">
              <button type="submit" className="bg-primary text-white rounded px-3 py-2 text-xs">保存修改并重新提交</button>
              <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-200 text-gray-700 rounded px-3 py-2 text-xs">取消</button>
            </div>
          </form>
        </section>
      )}

      {viewerSrc && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setViewerSrc(null)}>
          <img src={viewerSrc} alt="预览图片" className="max-w-[90vw] max-h-[85vh] rounded shadow-lg" />
        </div>
      )}
    </div>
  )
}