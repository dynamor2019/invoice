import { useEffect, useState } from 'react'
import { getApiBase, getApiHost } from '../store/api'
import { createBill } from '../store/bills'
import { getReasons, findDefaultSelection } from '../store/reasons'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../store/users'
import { TextField, Button, Select, MenuItem, InputLabel, FormControl } from '@mui/material'

export default function NewBill() {
  const navigate = useNavigate()
  const [reasons, setReasons] = useState([])
  const [rows, setRows] = useState([{ amount: '', catId: null, itemId: null, note: '', date: '', files: [], previewUrls: [] }])
  const [submitMsg, setSubmitMsg] = useState('')
  const [uploadMsg, setUploadMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploadedImages, setUploadedImages] = useState([])

const API_BASE = getApiBase()
const API_HOST = getApiHost()

  // 加载事由分级与默认选择
  useEffect(() => {
    (async () => {
      try {
        const list = await getReasons()
        setReasons(list)
        const def = findDefaultSelection(list)
        setRows([{ amount: '', catId: def.categoryId, itemId: def.itemId, note: '', date: '', files: [], previewUrls: [] }])
      } catch (e) {
        console.warn('load reasons failed', e)
      }
    })()
  }, [])

  // 页面获得焦点、收到“事由已更新”广播或跨标签 storage 事件时刷新事由，确保与事由编辑器保存后的数据同步
  useEffect(() => {
    const refresh = async () => {
      try {
        console.debug('[NewBill] refreshing reasons…')
        const list = await getReasons()
        setReasons(list)
        // 若当前选项无效，重置为默认选择
        setRows(prev => prev.map(r => {
          const cat = list.find(c => c.id === r.catId && c.status !== 'disabled') || null
          const item = cat ? (cat.items || []).find(i => i.id === r.itemId && i.status !== 'disabled') : null
          if (cat && item) return r
          const def = findDefaultSelection(list)
          return { ...r, catId: def.categoryId, itemId: def.itemId }
        }))
      } catch { /* ignore */ }
    }
    const onFocus = () => { refresh() }
    const onReasonsUpdated = () => { refresh() }
    const onStorage = (e) => { if (e?.key === 'reasons_updated_at') refresh() }
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }
    const onPageShow = () => { refresh() }
    window.addEventListener('focus', onFocus)
    window.addEventListener('reasons-updated', onReasonsUpdated)
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('reasons-updated', onReasonsUpdated)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

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
        // 解析选择的分类与项目名称
        const cat = reasons.find(c => c.id === r.catId) || reasons.find(c => String(c.name) === '其他') || reasons[0]
        const item = (cat?.items || []).find(i => i.id === r.itemId) || (cat?.items || []).find(i => String(i.name) === '未分类') || (cat?.items || [])[0]
        const catName = cat?.name || '其他'
        const itemName = item?.name || '未分类'
        const title = r.note ? `${itemName} - ${r.note}` : itemName
        bill = await createBill({ title, amount: r.amount, category: catName, date: r.date })
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
                    <div>
                      事由：{(() => {
                        const cat = reasons.find(c => c.id === r.catId)
                        const item = (cat?.items || []).find(i => i.id === r.itemId)
                        const text = `${cat?.name || '-'} / ${item?.name || '-'}`
                        return r.note ? `${text} - ${r.note}` : text
                      })()}
                    </div>
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
              <Button type="button" variant="outlined" className="flex-1" onClick={() => setConfirmOpen(false)}>返回修改</Button>
              <Button type="button" variant="contained" className="flex-1" onClick={doConfirmSubmit}>确认提交</Button>
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
          <div key={idx} className="space-y-3 border-b last:border-b-0 pb-3">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">票据 #{idx+1}</div>
              {rows.length > 1 && (
                <Button type="button" size="small" color="error" onClick={() => {
                  const next = [...rows]
                  const olds = next[idx]?.previewUrls || []
                  for (const u of olds) { try { URL.revokeObjectURL(u) } catch {} }
                  next.splice(idx, 1)
                  setRows(next)
                }}>删除</Button>
              )}
            </div>
            <div>
              <TextField
                fullWidth
                label="金额"
                type="number"
                value={r.amount}
                onChange={(e) => {
                  const next = [...rows]; next[idx] = { ...r, amount: e.target.value }; setRows(next)
                }}
                size="small"
              />
            </div>
            <div>
              <div className="grid grid-cols-2 gap-3">
                <FormControl fullWidth size="small">
                  <InputLabel id={`cat-label-${idx}`}>事由分类</InputLabel>
                  <Select
                    labelId={`cat-label-${idx}`}
                    label="事由分类"
                    value={r.catId ?? ''}
                    onChange={(e) => {
                      const catId = Number(e.target.value) || null
                      const cat = reasons.find(c => c.id === catId)
                      const defItem = (cat?.items || []).find(i => i.status !== 'disabled') || null
                      const next = [...rows]; next[idx] = { ...r, catId, itemId: defItem?.id || null }; setRows(next)
                    }}
                  >
                    {reasons.filter(c=>c.status!=='disabled').map(c => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel id={`item-label-${idx}`}>二级项目</InputLabel>
                  <Select
                    labelId={`item-label-${idx}`}
                    label="二级项目"
                    value={r.itemId ?? ''}
                    onChange={(e) => {
                      const itemId = Number(e.target.value) || null
                      const next = [...rows]; next[idx] = { ...r, itemId }; setRows(next)
                    }}
                  >
                    {(reasons.find(c=>c.id===r.catId)?.items||[]).filter(i=>i.status!=='disabled').map(it => (
                      <MenuItem key={it.id} value={it.id}>{it.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
              <TextField
                fullWidth
                label="补充说明（可选）"
                value={r.note}
                onChange={(e) => { const next = [...rows]; next[idx] = { ...r, note: e.target.value }; setRows(next) }}
                size="small"
                sx={{ mt: 1.5 }}
              />
            </div>
            <div>
              <TextField
                fullWidth
                label="日期"
                type="date"
                value={r.date}
                onChange={(e) => { const next = [...rows]; next[idx] = { ...r, date: e.target.value }; setRows(next) }}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ mt: 1.5 }}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-[2px]">附件上传（票据照片，可多选）</label>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">请选择图片附件</div>
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const el = document.getElementById(`file-input-${idx}`)
                    if (el) el.click()
                  }}
                >添加附件</Button>
              </div>
              <input
                id={`file-input-${idx}`}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  const next = [...rows]
                  const olds = next[idx]?.previewUrls || []
                  for (const u of olds) { try { URL.revokeObjectURL(u) } catch {} }
                  const previews = files.map(f => URL.createObjectURL(f))
                  next[idx] = { ...r, files, previewUrls: previews }
                  setRows(next)
                }}
                className="hidden"
              />
              {Array.isArray(r.files) && r.files.length > 0 ? (
                <div className="mt-[2px] text-xs text-gray-500">已选择：{r.files.map(f => f.name).join('，')}</div>
              ) : (
                <div className="mt-[2px] text-xs text-gray-400">未选择任何文件</div>
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
          <Button
            type="button"
            variant="outlined"
            className="flex-1"
            onClick={() => {
              const def = findDefaultSelection(reasons)
              setRows([...rows, { amount: '', catId: def.categoryId, itemId: def.itemId, note: '', date: '', files: [], previewUrls: [] }])
            }}
          >+ 添加一条票据</Button>
          <Button type="submit" variant="contained" className="flex-1">提交</Button>
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