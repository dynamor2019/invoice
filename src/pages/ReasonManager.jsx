import { useEffect, useState } from 'react'
import {
  getReasons,
  createReasonCategory,
  updateReasonCategory,
  deleteReasonCategory,
  createReasonItem,
  updateReasonItem,
  deleteReasonItem,
  reorderCategories,
  reorderItems,
} from '../store/reasons'

export default function ReasonManager() {
  const [reasons, setReasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCatId, setSelectedCatId] = useState(null)
  const [newCatName, setNewCatName] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [editingCatId, setEditingCatId] = useState(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [editingItemId, setEditingItemId] = useState(null)
  const [editingItemName, setEditingItemName] = useState('')
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState(null)
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState(null)

  // 广播：通知其他页面（新建票据等）刷新事由；并触发跨标签 storage 事件
  const broadcastReasonsUpdated = () => {
    try {
      const evt = new CustomEvent('reasons-updated', { detail: { at: Date.now(), source: 'ReasonManager' } })
      window.dispatchEvent(evt)
    } catch {}
    try { localStorage.setItem('reasons_updated_at', String(Date.now())) } catch {}
  }

  async function refresh() {
    setLoading(true)
    try {
      const list = await getReasons()
      setReasons(list)
      if (list.length > 0 && !selectedCatId) {
        // 默认选中第一个分类
        setSelectedCatId(list[0].id)
      } else if (list.length === 0) {
        setSelectedCatId(null)
      }
    } catch (e) {
      alert(e?.message || '加载事由分类失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const selectedCat = reasons.find(c => c.id === selectedCatId) || null

  const onAddCategory = async () => {
    const name = String(newCatName || '').trim()
    if (!name) { alert('请填写分类名称'); return }
    try {
      await createReasonCategory({ name, sort: (reasons[reasons.length - 1]?.sort || 0) + 1 })
      setNewCatName('')
      await refresh()
      broadcastReasonsUpdated()
    } catch (e) { alert(e?.message || '新增分类失败') }
  }

  const startEditCategory = (c) => {
    setEditingCatId(c.id)
    setEditingCatName(c.name)
  }
  const saveEditCategory = async () => {
    const id = editingCatId
    const name = String(editingCatName || '').trim()
    if (!id) return
    if (!name) { alert('名称不能为空'); return }
    try {
      await updateReasonCategory(id, { name })
      setEditingCatId(null)
      setEditingCatName('')
      await refresh()
      broadcastReasonsUpdated()
    } catch (e) { alert(e?.message || '编辑失败') }
  }
  const cancelEditCategory = () => { setEditingCatId(null); setEditingCatName('') }

  const onToggleCategory = async (c) => {
    const next = c.status === 'enabled' ? 'disabled' : 'enabled'
    try {
      await updateReasonCategory(c.id, { status: next })
      await refresh()
      broadcastReasonsUpdated()
    } catch (e) { alert(e?.message || '切换状态失败') }
  }

  const askDeleteCategory = (c) => { setConfirmDeleteCatId(c.id) }
  const cancelDeleteCategory = () => { setConfirmDeleteCatId(null) }
  const confirmDeleteCategory = async (c) => {
    try {
      await deleteReasonCategory(c.id)
      setConfirmDeleteCatId(null)
      await refresh()
      broadcastReasonsUpdated()
    } catch (e) { alert(e?.message || '删除失败（可能存在二级项目或为默认分类）') }
  }

  const moveCategory = async (c, dir) => {
    const idx = reasons.findIndex(x => x.id === c.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || swapIdx < 0 || swapIdx >= reasons.length) return
    const next = [...reasons]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    try {
      await reorderCategories(next.map(x => x.id))
      await refresh()
      broadcastReasonsUpdated()
    } catch (e) { alert(e?.message || '调整排序失败') }
  }

  const onAddItem = async () => {
    if (!selectedCat) return
    const name = String(newItemName || '').trim()
    if (!name) { alert('请填写项目名称'); return }
    try {
      await createReasonItem({ categoryId: selectedCat.id, name, sort: ((selectedCat.items||[])[(selectedCat.items||[]).length - 1]?.sort || 0) + 1 })
      setNewItemName('')
      await refresh()
      broadcastReasonsUpdated()
    } catch (e) { alert(e?.message || '新增失败') }
  }

  const startEditItem = (it) => {
    setEditingItemId(it.id)
    setEditingItemName(it.name)
  }
  const saveEditItem = async () => {
    const id = editingItemId
    const name = String(editingItemName || '').trim()
    if (!id) return
    if (!name) { alert('名称不能为空'); return }
    try {
      await updateReasonItem(id, { name })
      setEditingItemId(null)
      setEditingItemName('')
      await refresh()
      broadcastReasonsUpdated()
    } catch (e) { alert(e?.message || '编辑失败') }
  }
  const cancelEditItem = () => { setEditingItemId(null); setEditingItemName('') }

  const onToggleItem = async (it) => {
    const next = it.status === 'enabled' ? 'disabled' : 'enabled'
    try {
      await updateReasonItem(it.id, { status: next })
      await refresh()
      broadcastReasonsUpdated()
    } catch (e) { alert(e?.message || '切换状态失败') }
  }

  const askDeleteItem = (it) => { setConfirmDeleteItemId(it.id) }
  const cancelDeleteItem = () => { setConfirmDeleteItemId(null) }
  const confirmDeleteItem = async (it) => {
    try {
      await deleteReasonItem(it.id)
      setConfirmDeleteItemId(null)
      await refresh()
      broadcastReasonsUpdated()
    } catch (e) { alert(e?.message || '删除失败') }
  }

  const onSaveAll = async () => {
    // 统一保存入口（当前编辑逻辑已逐项保存）；此处确保刷新并提示
    try {
      await refresh()
      broadcastReasonsUpdated()
      alert('已保存并更新新建票据中的事由选项')
    } catch (e) { /* ignore */ }
  }

  const moveItem = async (it, dir) => {
    if (!selectedCat) return
    const arr = selectedCat.items || []
    const idx = arr.findIndex(x => x.id === it.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || swapIdx < 0 || swapIdx >= arr.length) return
    const next = [...arr]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    try {
      await reorderItems(selectedCat.id, next.map(x => x.id))
      await refresh()
      broadcastReasonsUpdated()
    } catch (e) { alert(e?.message || '调整排序失败') }
  }

  return (
    <section className="mb-6 bg-orange-100 border border-orange-300 rounded-lg p-3 shadow-sm border-l-4 border-orange-400">
      <h3 className="text-sm font-medium text-gray-700 mb-2">票据事由管理</h3>
      <p className="text-xs text-gray-600 mb-2">左侧一级分类，右侧二级项目；支持新增、编辑、删除与排序。默认分类「其他」不可删除，禁用状态不可在新建票据中选择。</p>
      {loading ? (
        <div className="text-xs text-gray-600">加载中…</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* 一级分类列表 */}
          <div className="rounded-lg border border-primary/20 p-2 bg-white">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">一级分类</div>
              <div className="flex items-center gap-2">
                <input
                  value={newCatName}
                  onChange={e=>setNewCatName(e.target.value)}
                  placeholder="输入分类名称"
                  className="rounded border border-primary/30 px-2 py-1 text-xs"
                />
                <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={onAddCategory}>新增</button>
              </div>
            </div>
            <ul className="mt-2 space-y-2">
              {reasons.map(c => (
                <li key={c.id} className={(selectedCatId===c.id? 'border-blue-300':'border-primary/20')+ ' rounded-lg border px-2 py-2 flex items-center justify-between'}>
                  <button className="text-left" onClick={() => setSelectedCatId(c.id)}>
                    <div className="text-gray-800 text-sm">
                      {editingCatId === c.id ? (
                        <input
                          value={editingCatName}
                          onChange={e=>setEditingCatName(e.target.value)}
                          className="rounded border border-primary/30 px-2 py-1 text-xs"
                        />
                      ) : (
                        <span>{c.name}</span>
                      )}
                      {c.status === 'disabled' ? <span className="text-xs text-gray-500"> (禁用)</span> : null}
                    </div>
                    <div className="text-xs text-gray-500">排序：{c.sort}</div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={() => moveCategory(c,'up')}>上移</button>
                    <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={() => moveCategory(c,'down')}>下移</button>
                    {editingCatId === c.id ? (
                      <>
                        <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={saveEditCategory}>保存</button>
                        <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={cancelEditCategory}>取消</button>
                      </>
                    ) : (
                      <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={() => startEditCategory(c)}>编辑</button>
                    )}
                    <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={() => onToggleCategory(c)}>{c.status==='enabled'?'禁用':'启用'}</button>
                    {confirmDeleteCatId === c.id ? (
                      <>
                        <button className="text-xs bg-white border border-red-400 text-red-600 px-2 py-1 rounded" onClick={() => confirmDeleteCategory(c)}>确认删除</button>
                        <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={cancelDeleteCategory}>取消</button>
                      </>
                    ) : (
                      <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={() => askDeleteCategory(c)}>删除</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {/* 二级项目列表 */}
          <div className="rounded-lg border border-primary/20 p-2 bg-white">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">二级项目 {selectedCat ? `（${selectedCat.name}）` : ''}</div>
              <div className="flex items-center gap-2">
                <input
                  value={newItemName}
                  onChange={e=>setNewItemName(e.target.value)}
                  placeholder="输入项目名称"
                  className="rounded border border-primary/30 px-2 py-1 text-xs"
                  disabled={!selectedCat}
                />
                <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" disabled={!selectedCat} onClick={onAddItem}>新增</button>
              </div>
            </div>
            {!selectedCat ? (
              <div className="text-xs text-gray-500 mt-2">请选择左侧一个一级分类</div>
            ) : (
              <ul className="mt-2 space-y-2">
                {(selectedCat.items||[]).map(it => (
                  <li key={it.id} className="rounded-lg border border-primary/20 px-2 py-2 flex items-center justify-between">
                    <div>
                      <div className="text-gray-800 text-sm">
                        {editingItemId === it.id ? (
                          <input
                            value={editingItemName}
                            onChange={e=>setEditingItemName(e.target.value)}
                            className="rounded border border-primary/30 px-2 py-1 text-xs"
                          />
                        ) : (
                          <span>{it.name}</span>
                        )}
                        {it.status === 'disabled' ? <span className="text-xs text-gray-500"> (禁用)</span> : null}
                      </div>
                      <div className="text-xs text-gray-500">排序：{it.sort}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={() => moveItem(it,'up')}>上移</button>
                      <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={() => moveItem(it,'down')}>下移</button>
                      {editingItemId === it.id ? (
                        <>
                          <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={saveEditItem}>保存</button>
                          <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={cancelEditItem}>取消</button>
                        </>
                      ) : (
                        <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={() => startEditItem(it)}>编辑</button>
                      )}
                      <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={() => onToggleItem(it)}>{it.status==='enabled'?'禁用':'启用'}</button>
                      {confirmDeleteItemId === it.id ? (
                        <>
                          <button className="text-xs bg-white border border-red-400 text-red-600 px-2 py-1 rounded" onClick={() => confirmDeleteItem(it)}>确认删除</button>
                          <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={cancelDeleteItem}>取消</button>
                        </>
                      ) : (
                        <button className="text-xs bg-white border border-primary/30 px-2 py-1 rounded" onClick={() => askDeleteItem(it)}>删除</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* 底部统一保存 */}
          <div className="col-span-2 mt-2 text-right">
            <button className="text-xs bg-white border border-primary/30 px-3 py-1 rounded" onClick={onSaveAll}>保存</button>
          </div>
        </div>
      )}
    </section>
  )
}