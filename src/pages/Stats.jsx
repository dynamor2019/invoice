import { useEffect, useMemo, useState } from 'react'
import { getArchivedBills } from '../store/bills'
import { getUsers } from '../store/users'
import * as XLSX from 'xlsx'

export default function Stats({ embedded = false }) {
  const [archived, setArchived] = useState([])
  const [loading, setLoading] = useState(true)
  const [idNameMap, setIdNameMap] = useState({})

  // 导出选项（默认全选）
  const BILL_COLUMNS = [
    { key: 'id', label: '票据ID' },
    { key: 'title', label: '标题' },
    { key: 'amount', label: '金额' },
    { key: 'category', label: '类别' },
    { key: 'status', label: '状态' },
    { key: 'date', label: '票据日期' },
    { key: 'createdBy', label: '报销人' },
  ]
  const [showExportOpts, setShowExportOpts] = useState(false)
  const [exportSel, setExportSel] = useState(() => {
    const init = {}
    for (const c of BILL_COLUMNS) init[c.key] = true
    return init
  })

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const list = await getArchivedBills()
        setArchived(Array.isArray(list) ? list : [])
        const users = await getUsers().catch(()=>[])
        const map = {}
        for (const u of users) map[u.id] = u.name
        setIdNameMap(map)
      } catch {
        setArchived([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // 月度合计: 以票据日期 b.date 为基准，聚合已归档
  const monthlyTotals = useMemo(() => {
    const agg = {}
    for (const b of archived) {
      if (!b || b.status !== 'archived') continue
      const d = new Date(b.date)
      if (isNaN(d.valueOf())) continue
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const amt = Number(b.amount) || 0
      agg[k] = (agg[k] || 0) + amt
    }
    const entries = Object.entries(agg).sort((a,b)=> (a[0] < b[0] ? 1 : -1))
    return entries
  }, [archived])

  // 报销人分布（饼图数据）：以 createdBy 聚合已归档金额
  const byPersonTotals = useMemo(() => {
    const agg = {}
    for (const b of archived) {
      if (!b || b.status !== 'archived') continue
      const key = b.createdBy || '未知'
      const amt = Number(b.amount) || 0
      agg[key] = (agg[key] || 0) + amt
    }
    const entries = Object.entries(agg).sort((a,b)=> b[1]-a[1])
    const total = entries.reduce((sum, [,v])=> sum+v, 0)
    return { entries, total }
  }, [archived])

  const fmtCurrency = (n) => `¥${(Number(n)||0).toFixed(2)}`

  // 导出 Excel（按导出选项）
  const exportExcel = () => {
    try {
      const wb = XLSX.utils.book_new()
      // 归档票据明细（按列选择）
      const billsRows = archived
        .filter(b => b && b.status === 'archived')
        .map(b => {
          const row = {}
          for (const c of BILL_COLUMNS) {
            if (!exportSel[c.key]) continue
            let val = b[c.key]
            if (c.key === 'amount') val = Number(val) || 0
            if (c.key === 'createdBy') val = idNameMap[b.createdBy] || b.createdBy
            row[c.label] = val
          }
          return row
        })
      const wsBills = XLSX.utils.json_to_sheet(billsRows)
      XLSX.utils.book_append_sheet(wb, wsBills, '归档票据')

      // 按月汇总
      const monthlyRows = monthlyTotals.map(([month, total]) => ({ 月份: month, 报销总额: Number(total) || 0 }))
      const wsMonthly = XLSX.utils.json_to_sheet(monthlyRows)
      XLSX.utils.book_append_sheet(wb, wsMonthly, '按月汇总')

      // 按人汇总
      const personRows = byPersonTotals.entries.map(([uid, total]) => ({ 报销人: idNameMap[uid] || uid, 报销总额: Number(total) || 0 }))
      const wsPerson = XLSX.utils.json_to_sheet(personRows)
      XLSX.utils.book_append_sheet(wb, wsPerson, '按人汇总')

      const now = new Date()
      const fname = `财务统计_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.xlsx`
      XLSX.writeFile(wb, fname)
    } catch (e) {
      alert(e?.message || '导出失败')
    }
  }

  // 简易环形饼图：使用多个圆弧段（stroke-dasharray/dashoffset）绘制
  const PieChart = ({ data }) => {
    const size = 160
    const cx = 80, cy = 80, r = 70
    const C = 2 * Math.PI * r
    const palette = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f472b6','#22c55e','#f97316']
    let offset = C
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {/* 背景圈 */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eee" strokeWidth="20" />
          {data.entries.map(([key, value], idx) => {
            const frac = data.total > 0 ? (value / data.total) : 0
            const seg = frac * C
            const dasharray = `${seg} ${C}`
            const color = palette[idx % palette.length]
            const el = (
              <circle key={key}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={color}
                strokeWidth="20"
                strokeDasharray={dasharray}
                strokeDashoffset={offset - seg}
              />
            )
            offset -= seg
            return el
          })}
        </g>
      </svg>
    )
  }

  return (
    <div className="space-y-4">
      {/* 头部：嵌入模式下隐藏 */}
      {!embedded && (
        <div className="rounded-xl overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary-dark text-white p-4">
            <div className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-label="平台统计">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
              <p className="text-xs opacity-90">归档数据统计：月度合计与报销人分布</p>
            </div>
          </div>
        </div>
      )}

      {/* 工具栏：导出 + 选项 */}
      {!loading && archived.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowExportOpts(v=>!v)} className="text-xs px-3 py-1 rounded border border-primary/20">导出选项</button>
            {showExportOpts && (
              <div className="text-xs bg-white rounded border border-primary/20 p-2 shadow-sm">
                <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                  {BILL_COLUMNS.map(c => (
                    <label key={c.key} className="flex items-center gap-1">
                      <input type="checkbox" className="accent-primary" checked={!!exportSel[c.key]} onChange={e=>setExportSel(s=>({ ...s, [c.key]: e.target.checked }))} />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={exportExcel} className="text-xs px-3 py-1 rounded bg-primary text-black border border-primary/20">导出Excel</button>
        </div>
      )}

      {/* 加载与空态 */}
      {loading && <div className="text-xs text-gray-500">加载中...</div>}
      {!loading && archived.length === 0 && (
        <div className="text-xs text-gray-500">暂无归档数据，统计为空。</div>
      )}

      {/* 月度合计表格 */}
      {!loading && archived.length > 0 && (
        <section className="bg-white rounded-lg border border-primary/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-700">月度报销总额</h3>
            <div className="text-xs text-gray-500">仅统计已归档</div>
          </div>
          {monthlyTotals.length === 0 ? (
            <div className="text-xs text-gray-500">暂无有效月份数据</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="py-2 pr-3">月份</th>
                    <th className="py-2">报销总额</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTotals.map(([month, total]) => (
                    <tr key={month} className="border-t">
                      <td className="py-2 pr-3">{month}</td>
                      <td className="py-2">{fmtCurrency(total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 报销人饼图 */}
      {!loading && archived.length > 0 && (
        <section className="bg-white rounded-lg border border-primary/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-700">按报销人分布</h3>
            <div className="text-xs text-gray-500">仅统计已归档</div>
          </div>
          {byPersonTotals.total <= 0 ? (
            <div className="text-xs text-gray-500">暂无数据</div>
          ) : (
            <div className="flex items-start gap-4">
              <PieChart data={byPersonTotals} />
              <div className="text-xs space-y-1">
                {byPersonTotals.entries.map(([uid, total], idx) => (
                  <div key={uid} className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f472b6','#22c55e','#f97316'][idx % 10] }} />
                    <span>{idNameMap[uid] || uid}</span>
                    <span className="text-gray-500">{fmtCurrency(total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}