import { useEffect, useState } from 'react'
import { createBill } from '../store/bills'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../store/users'

export default function NewBill() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([{ amount: '', reason: '', date: '', files: [], previewUrls: [] }])
  const [submitMsg, setSubmitMsg] = useState('')
  const [uploadMsg, setUploadMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploadedImages, setUploadedImages] = useState([])

  const API_BASE = (import.meta?.env?.VITE_API_BASE) || '/api'
  const API_HOST = API_BASE.replace(/\/api$/, '')

  // 预览用于单张弹窗放大显示
  useEffect(() => () => { if (previewUrl) try { URL.revokeObjectURL(previewUrl) } catch {} }, [previewUrl])

  const onSubmit = async (e) => {
    e.preventDefault()
    // 打开确认卡片，由用户确认后再真正提交
    setConfirmOpen(true)
  }

  async function doConfirmSubmit() {
    setConfirmOpen(false)
    setSubmitMsg('提交成功')
    setProgress(0)
    const allUploaded = []
    for (const r of rows) {
      let bill
      try {
        bill = await createBill({ title: r.reason || '票据', amount: r.amount, category: '通用', date: r.date })
      } catch (err) {
        alert(err?.message || '创建票据失败，请先登录或稍后再试')
        // 若未登录导致 401，跳转登录
        if ((err?.message || '').includes('401')) {
          return navigate('/login')
        }
        return
      }
      try {
        if (Array.isArray(r.files) && r.files.length > 0) {
          const fd = new FormData()
          for (const f of r.files) fd.append('images', f)
          const u = getCurrentUser()
          const headers = u?.token ? { Authorization: `Bearer ${u.token}` } : {}
          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open('POST', `${API_BASE}/bill/${bill.id}/upload`)
            if (headers.Authorization) xhr.setRequestHeader('Authorization', headers.Authorization)
            xhr.upload.onprogress = (evt) => {
              if (evt.lengthComputable) {
                const p = Math.round((evt.loaded / evt.total) * 100)
                setProgress(p)
              }
            }
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const data = JSON.parse(xhr.responseText || '{}')
                  if (Array.isArray(data.images)) allUploaded.push(...data.images)
                } catch {}
                resolve()
              } else {
                reject(new Error(xhr.responseText || `上传失败(${xhr.status})`))
              }
            }
            xhr.onerror = () => reject(new Error('网络错误，上传失败'))
            xhr.send(fd)
          })
          // 下一条前重置进度
          setProgress(0)
        }
      } catch (err) {
        console.warn('upload error', err)
      }
    }
    if (allUploaded.length > 0) {
      setUploadedImages(allUploaded)
      setUploadMsg('附件已上传完成')
      setTimeout(() => setUploadMsg(''), 2000)
      setTimeout(() => navigate('/home'), 2000)
    } else {
      navigate('/home')
    }
  }

  return (
    <div className="space-y-[2px]">
      <div className="rounded-xl overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary-dark text-white p-4">
          <div className="flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-label="新建票据">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14l4-4h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
              <path d="M12 7v3H9v2h3v3h2v-3h3v-2h-3V7h-2z"/>
            </svg>
            <p className="text-xs opacity-90">填写信息并提交进入审批</p>
          </div>
        </div>
      </div>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl border border-blue-200 w-[90vw] max-w-md p-4 animate-[fadeIn_0.2s_ease-out] scale-100">
            <div className="text-center mb-[2px]">
              <div className="text-base font-semibold">确认提交信息</div>
              <div className="text-xs text-gray-500">请核对后再提交</div>
            </div>
            <div className="space-y-[2px] max-h-[70vh] overflow-auto">
              {rows.map((r, idx) => (
                <div key={idx} className="rounded border border-gray-200 p-2">
                  <div className="grid grid-cols-2 gap-[2px] text-sm">
                    <div>金额：{r.amount || '-'}</div>
                    <div>事由：{r.reason || '-'}</div>
                    <div>日期：{r.date || '-'}</div>
                    <div>附件：{Array.isArray(r.files) && r.files.length > 0 ? `${r.files.length} 张（${r.files.map(f=>f.name).join('，')}）` : '无'}</div>
                  </div>
                  {Array.isArray(r.previewUrls) && r.previewUrls.length > 0 && (
                    <div className="pt-[2px]">
                      <div className="text-xs text-gray-600 mb-[2px]">附件预览</div>
                      <div className="grid grid-cols-3 gap-[2px]">
                        {r.previewUrls.map((u,i) => (
                          <img key={i} src={u} alt={`预览${i+1}`} className="w-full h-20 object-cover rounded border cursor-zoom-in" onClick={() => setPreviewUrl(u)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-[2px] pt-[2px]">
              <button type="button" onClick={() => setConfirmOpen(false)} className="flex-1 border rounded py-2">返回修改</button>
              <button type="button" onClick={doConfirmSubmit} className="flex-1 bg-primary text-black rounded py-2 font-semibold">确认提交</button>
            </div>
          </div>
        </div>
      )}
      {submitMsg && (
        <div className="rounded border border-green-200 bg-green-50 text-green-700 text-xs px-3 py-2">{submitMsg}</div>
      )}
      {rows.some(r => Array.isArray(r.files) && r.files.length > 0) ? (
        <div className="space-y-[2px]">
          {progress > 0 && progress < 100 && (
            <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
              <div className="bg-blue-600 h-2" style={{ width: `${progress}%` }} />
            </div>
          )}
          {uploadMsg && (
            <div className="text-xs text-green-700">{uploadMsg}</div>
          )}
          {Array.isArray(uploadedImages) && uploadedImages.length > 0 && (
            <div className="pt-[2px]">
              <div className="text-xs text-gray-600 mb-[2px]">已上传附件</div>
              <div className="grid grid-cols-3 gap-[2px]">
                {uploadedImages.map((img, i) => (
                  <img key={i} src={`${API_HOST}${img}`} alt={`已上传${i+1}`} className="w-full h-20 object-cover rounded border" />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-[2px] bg-white rounded-lg border border-primary/20 p-3">
        {rows.map((r, idx) => (
          <div key={idx} className="space-y-[2px] border-b last:border-b-0 pb-3">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">票据 #{idx+1}</div>
              {rows.length > 1 && (
                <button type="button" className="text-xs text-red-600" onClick={() => {
                  const next = [...rows]
                  const olds = next[idx]?.previewUrls || []
                  for (const u of olds) { try { URL.revokeObjectURL(u) } catch {} }
                  next.splice(idx, 1)
                  setRows(next)
                }}>删除</button>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-[2px]">金额</label>
              <input
                type="number"
                value={r.amount}
                onChange={(e) => {
                  const next = [...rows]; next[idx] = { ...r, amount: e.target.value }; setRows(next)
                }}
                className="w-full rounded-lg border border-primary/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="请输入金额"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-[2px]">事由</label>
              <input
                type="text"
                value={r.reason}
                onChange={(e) => { const next = [...rows]; next[idx] = { ...r, reason: e.target.value }; setRows(next) }}
                className="w-full rounded-lg border border-primary/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="请输入事由"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-[2px]">日期</label>
              <input
                type="date"
                value={r.date}
                onChange={(e) => { const next = [...rows]; next[idx] = { ...r, date: e.target.value }; setRows(next) }}
                className="w-full rounded-lg border border-primary/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-[2px]">附件上传（票据照片，可多选）</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  const next = [...rows]
                  // 回收旧预览
                  const olds = next[idx]?.previewUrls || []
                  for (const u of olds) { try { URL.revokeObjectURL(u) } catch {} }
                  const previews = files.map(f => URL.createObjectURL(f))
                  next[idx] = { ...r, files, previewUrls: previews }
                  setRows(next)
                }}
                className="w-full"
              />
              {Array.isArray(r.files) && r.files.length > 0 && (
                <div className="mt-[2px] text-xs text-gray-500">已选择：{r.files.map(f => f.name).join('，')}</div>
              )}
              {Array.isArray(r.previewUrls) && r.previewUrls.length > 0 && (
                <div className="mt-[2px] grid grid-cols-3 gap-[2px]">
                  {r.previewUrls.map((u,i) => (
                    <img key={i} src={u} alt={`预览${i+1}`} className="w-full h-20 object-cover rounded border cursor-zoom-in" onClick={() => setPreviewUrl(u)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div className="flex gap-[2px]">
          <button type="button" className="flex-1 border rounded-lg py-2" onClick={() => setRows([...rows, { amount: '', reason: '', date: '', files: [], previewUrls: [] }])}>+ 添加一条票据</button>
          <button type="submit" className="flex-1 bg-primary text-black rounded-lg py-2 shadow font-semibold">提交</button>
        </div>
      </form>
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setPreviewUrl('')}>
          <div className="absolute inset-0 bg-black/70" />
          <img src={previewUrl} alt="放大预览" className="relative max-w-[92vw] max-h-[88vh] rounded shadow-2xl" />
        </div>
      )}
    </div>
  )
}