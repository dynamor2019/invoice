import { useEffect, useState } from 'react'
import { getArchivedBills } from '../store/bills'
import { getUsers } from '../store/users'

export default function Archive() {
  const [archived, setArchived] = useState([])
  const [loading, setLoading] = useState(true)
  const [idNameMap, setIdNameMap] = useState({})
  useEffect(() => {
    (async () => {
      setLoading(true)
      const list = await getArchivedBills()
      setArchived(list)
      try {
        const users = await getUsers()
        const map = {}
        for (const u of users) map[u.id] = u.name
        setIdNameMap(map)
      } catch {}
      setLoading(false)
    })()
  }, [])
  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary-dark text-white p-4 text-center">
          <h2 className="text-base font-semibold text-center">财务归档</h2>
          <p className="text-xs mt-1 opacity-90 text-center">查看会计已归档的票据记录</p>
        </div>
      </div>
      <div className="space-y-2">
        {loading && <div className="text-xs text-gray-500">加载中...</div>}
        {!loading && archived.length === 0 && <div className="text-xs text-gray-500">暂无归档记录</div>}
        {!loading && archived.map((b) => (
          <div key={b.id} className="rounded-lg border border-primary/20 p-3 bg-white">
            <div className="flex justify-between">
              <span className="font-medium">{b.title} #{b.id}</span>
              <span className="text-xs text-green-600">已归档</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">金额：¥{b.amount.toFixed(2)} · 类别：{b.category} · 日期：{b.date}</div>
            <div className="text-xs text-gray-500 mt-1">发起人：{idNameMap[b.createdBy] || b.createdBy}</div>
          </div>
        ))}
      </div>
    </div>
  )
}