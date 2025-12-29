import React, { useEffect, useState } from 'react'
import { getCurrentUser } from '../store/users'
import { getApiBase } from '../store/api'
import { 
  Home, 
  Description, 
  AttachMoney, 
  Check, 
  Warning, 
  Info,
  Close
} from '@mui/icons-material'

const API_BASE = getApiBase()

function authHeaders(base = {}) {
  const u = getCurrentUser()
  const token = u?.token
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

async function getNotifications() {
  const res = await fetch(`${API_BASE}/notifications`, { headers: authHeaders() })
  if (!res.ok) throw new Error('获取通知失败')
  return res.json()
}

async function markAsRead(notificationId) {
  const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: authHeaders()
  })
  if (!res.ok) throw new Error('标记已读失败')
  return res.json()
}

export default function NotificationCenter({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await getNotifications()
      setNotifications(data)
    } catch (e) {
      console.error('加载通知失败:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: 1 } : n)
      )
    } catch (e) {
      console.error('标记已读失败:', e)
    }
  }

  const getTypeIcon = (type) => {
    const iconProps = { theme: "outline", size: "16" }
    
    switch(type) {
      case 'project':
        return <Home sx={{ fontSize: 20 }} className="text-blue-500" />
      case 'contract':
        return <Description sx={{ fontSize: 20 }} className="text-green-500" />
      case 'payment':
        return <AttachMoney sx={{ fontSize: 20 }} className="text-yellow-500" />
      case 'approval':
        return <Check sx={{ fontSize: 20 }} className="text-green-500" />
      case 'warning':
        return <Warning sx={{ fontSize: 20 }} className="text-orange-500" />
      case 'info':
      default:
        return <Info sx={{ fontSize: 20 }} className="text-blue-500" />
    }
  }

  const getTypeColor = (type) => {
    const colors = {
      'project': 'bg-blue-50 text-blue-700',
      'contract': 'bg-green-50 text-green-700',
      'payment': 'bg-purple-50 text-purple-700',
      'approval': 'bg-emerald-50 text-emerald-700',
      'warning': 'bg-yellow-50 text-yellow-700',
      'info': 'bg-gray-50 text-gray-700'
    }
    return colors[type] || 'bg-gray-50 text-gray-700'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-lg font-bold">系统通知</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <Close sx={{ fontSize: 20 }} />
          </button>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">📬</div>
              <div className="text-gray-500">加载通知中...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📭</div>
              <div className="text-gray-500">暂无通知</div>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    notification.isRead 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-white border-blue-200 shadow-sm'
                  }`}
                  onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full text-sm ${getTypeColor(notification.type)}`}>
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${notification.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                        {notification.title}
                      </div>
                      <div className={`text-sm mt-1 ${notification.isRead ? 'text-gray-500' : 'text-gray-700'}`}>
                        {notification.content}
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}