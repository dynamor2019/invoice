import { useEffect, useRef, useState } from 'react'

export default function Drawer({ open, onClose, children, duration = 300 }) {
  const overlayRef = useRef(null)
  const panelRef = useRef(null)
  const touch = useRef({ startY: 0, currentY: 0, dragging: false })
  const [rendered, setRendered] = useState(open)

  // After close, keep rendering for the duration to allow animation, then unmount
  useEffect(() => {
    let timer
    if (open) {
      setRendered(true)
    } else {
      timer = setTimeout(() => setRendered(false), duration)
    }
    return () => { if (timer) clearTimeout(timer) }
  }, [open, duration])

  useEffect(() => {
    const overlay = overlayRef.current
    const panel = panelRef.current
    if (!overlay || !panel) return

    const onTouchStart = (e) => {
      const t = e.touches?.[0]
      if (!t) return
      touch.current = { startY: t.clientY, currentY: t.clientY, dragging: true }
    }
    const onTouchMove = (e) => {
      if (!touch.current.dragging) return
      const t = e.touches?.[0]
      if (!t) return
      touch.current.currentY = t.clientY
      const dy = Math.max(0, touch.current.currentY - touch.current.startY)
      // translate panel down while dragging
      panel.style.transform = `translateY(${dy}px)`
    }
    const onTouchEnd = () => {
      if (!touch.current.dragging) return
      const dy = touch.current.currentY - touch.current.startY
      touch.current.dragging = false
      // close if dragged down enough
      if (dy > 80) {
        onClose && onClose()
      } else {
        // revert to opened position
        panel.style.transition = `transform ${duration}ms ease`
        panel.style.transform = 'translateY(0)'
        setTimeout(() => { panel.style.transition = '' }, duration)
      }
    }
    overlay.addEventListener('touchstart', onTouchStart, { passive: true })
    overlay.addEventListener('touchmove', onTouchMove, { passive: true })
    overlay.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      overlay.removeEventListener('touchstart', onTouchStart)
      overlay.removeEventListener('touchmove', onTouchMove)
      overlay.removeEventListener('touchend', onTouchEnd)
    }
  }, [open, onClose, duration])

  // If not rendered (after close animation), unmount entirely
  if (!rendered) return null

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        style={{
          opacity: open ? 1 : 0,
          transition: `opacity ${duration}ms ease`,
        }}
      />
      {/* panel bottom */}
      <div
        ref={panelRef}
        className="absolute left-0 right-0 bottom-0 bg-white rounded-t-xl shadow-2xl border border-gray-200"
        style={{
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${duration}ms ease`,
        }}
      >
        <div className="p-3 border-b flex items-center justify-between">
          <div className="text-sm font-medium">详细内容</div>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded bg-gray-100 border">关闭</button>
        </div>
        <div className="p-3 max-h-[60vh] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}