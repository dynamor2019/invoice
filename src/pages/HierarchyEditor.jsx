import { useState, useEffect } from 'react'
import { getReasonHierarchy, setReasonHierarchy } from '../store/settings'
import { getCurrentUser } from '../store/users'

// 移动端层级结构编辑器
// - 垂直排列，按层级递增 20px 缩进
// - 文本框：200x40，1px 边框，白底，默认占位“点击输入内容”
// - 同级添加：右侧圆形“+”按钮，点击在当前正下方生成同级文本框，间距10px
// - 子级添加（可选流程）：点击文本框显示左侧“−”按钮；点击“−”切换为“+”；再点击“+”在下方生成子级文本框（缩进+20px）
export default function HierarchyEditor() {
  const [nodes, setNodes] = useState([
    { id: 1, text: '', level: 0 },
  ])
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // 仅保留内部与外部按钮，移除输入聚焦时出现的左侧子级按钮

  const nextId = () => Math.max(0, ...nodes.map(n => n.id)) + 1

  const addSiblingAfter = (index) => {
    const ref = nodes[index]
    // 插入位置应在当前项的整棵子树之后：
    // 从 index+1 开始，跳过所有 level > ref.level 的连续项
    let insertIdx = index + 1
    while (insertIdx < nodes.length && nodes[insertIdx].level > ref.level) {
      insertIdx++
    }
    const newNode = { id: nextId(), text: '', level: ref.level }
    const next = [...nodes]
    next.splice(insertIdx, 0, newNode)
    setNodes(next)
  }

  const addChildAfter = (index) => {
    const ref = nodes[index]
    const newNode = { id: nextId(), text: '', level: ref.level + 1 }
    const next = [...nodes]
    next.splice(index + 1, 0, newNode)
    setNodes(next)
  }

  const removeNode = (index) => {
    const next = [...nodes]
    next.splice(index, 1)
    setNodes(next)
  }

  const onTextChange = (id, value) => {
    setNodes(prev => prev.map(n => (n.id === id ? { ...n, text: value } : n)))
  }

  // 输入不触发额外按钮显示，避免干扰输入

  const unitStyle = (level) => ({
    marginLeft: `${level * 20}px`,
    width: '80%',
    height: '40px',
    border: '1px solid #D1D5DB', // gray-300 基础边框（去掉绿色边缘）
    // 背景改回纯白，保持文本框为白色展示
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '10px',
    paddingRight: '10px',
  })

  const rightButtonWrapStyle = {
    position: 'absolute',
    right: '10px', // 子级按钮靠最右
    top: '50%',
    transform: 'translateY(-50%)',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const rightButtonStyle = {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#E5E7EB', // gray-200
    color: '#FFFFFF',
    fontWeight: 700,
    lineHeight: '20px',
    textAlign: 'center',
    userSelect: 'none',
  }

  // 移除左侧按钮样式

  const deleteButtonWrapStyle = {
    position: 'absolute',
    right: '54px', // 紧贴子级按钮（右 10 + 宽 44 = 左 54）
    top: '50%',
    transform: 'translateY(-50%)',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const deleteButtonStyle = {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#F87171', // red-400
    color: '#FFFFFF',
    fontWeight: 700,
    lineHeight: '20px',
    textAlign: 'center',
    userSelect: 'none',
  }

  const outerRightButtonWrapStyle = {
    position: 'absolute',
    right: '-54px', // 同级按钮置于容器外部
    top: '50%',
    transform: 'translateY(-50%)',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  // 初始化：从服务端加载已保存的层级
  useEffect(() => {
    (async () => {
      try {
        const list = await getReasonHierarchy()
        if (Array.isArray(list) && list.length > 0) {
          // 以顺序重建节点，生成递增 id
          let idSeq = 1
          const rebuilt = list.map(n => ({ id: idSeq++, text: String(n.text||''), level: Number(n.level)||0 }))
          setNodes(rebuilt)
        }
      } catch {
        // ignore load error
      } finally {
        setLoaded(true)
      }
    })()
  }, [])

  const onSave = async () => {
    setSaving(true)
    try {
      // 权限校验：仅管理员可保存并同步到票据事由分类
      const u = getCurrentUser()
      if (u?.role !== 'admin') {
        alert('需要管理员登录才能保存事由层级并同步到分类')
        return
      }
      const payload = nodes.map(n => ({ text: String(n.text||''), level: Number(n.level)||0 }))
      await setReasonHierarchy(payload)
      alert('事由层级已保存')
      // 广播：通知其他页面（如新建票据页）刷新事由分类与项目
      try {
        const evt = new CustomEvent('reasons-updated', { detail: { at: Date.now() } })
        window.dispatchEvent(evt)
        // 跨标签页同步：写入 localStorage 以触发 storage 事件
        try { localStorage.setItem('reasons_updated_at', String(Date.now())) } catch {}
      } catch { /* ignore */ }
    } catch (e) {
      alert(e?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col">
        {nodes.map((n, idx) => (
          <div key={n.id} className="mb-[10px]">
            <div style={unitStyle(n.level)}>
                {/* 文本框本体 */}
                <input
                  value={n.text}
                  onChange={(e) => onTextChange(n.id, e.target.value)}
                  placeholder="点击输入内容"
                  className="w-full h-full text-sm text-gray-800 outline-none"
                  style={{ paddingRight: '110px', background: '#FFFFFF' }}
                />
                {/* 内部右侧按钮：添加子级 */}
                <button
                  type="button"
                  aria-label="添加子级"
                  onClick={() => addChildAfter(idx)}
                  style={rightButtonWrapStyle}
                >
                  <div style={rightButtonStyle}>+</div>
                </button>
                {/* 删除按钮（新增内容后显示，这里为简单一致性，对所有非首项显示） */}
                {idx !== 0 && (
                  <button
                    type="button"
                    aria-label="删除当前项"
                    onClick={() => removeNode(idx)}
                    style={deleteButtonWrapStyle}
                  >
                    <div style={deleteButtonStyle}>−</div>
                  </button>
                )}
                {/* 外部右侧按钮：添加同级（在容器外侧） */}
                <button
                  type="button"
                  aria-label="添加同级"
                  onClick={() => addSiblingAfter(idx)}
                  style={outerRightButtonWrapStyle}
                >
                  <div style={rightButtonStyle}>+</div>
                </button>
            </div>
          </div>
        ))}
        {/* 操作区：保存（移动到最下方） */}
        <div className="mt-[6px]">
          <button
            type="button"
            onClick={onSave}
            className="px-3 py-2 rounded bg-primary text-black text-xs font-semibold"
            disabled={saving}
          >{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  )
}