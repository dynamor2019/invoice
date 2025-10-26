import { useState } from 'react'
import { getCurrentUser, changePassword } from '../store/users'

export default function Settings() {
  const user = getCurrentUser()
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [msg, setMsg] = useState('')

  if (!user) {
    return <div className="text-sm text-gray-600">请先登录后再访问设置</div>
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    try {
      await changePassword(user.id, oldPwd, newPwd)
      setMsg('密码修改成功')
      setOldPwd('')
      setNewPwd('')
    } catch (err) {
      setMsg(err.message || '修改失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary-dark text-white p-5 text-center">
          <h2 className="text-xl font-semibold text-center">用户设置</h2>
          <p className="text-xs mt-1 opacity-90 text-center">修改账户密码与个人信息</p>
        </div>
      </div>
      <section className="bg-white rounded-lg border border-primary/20 p-3">
        <h3 className="text-sm text-gray-700 mb-2">修改我的密码</h3>
        <form onSubmit={onSubmit} className="grid grid-cols-3 gap-2 items-end">
          <div>
            <label className="block text-xs text-gray-600 mb-1">原密码</label>
            <input type="password" value={oldPwd} onChange={e=>setOldPwd(e.target.value)} className="w-full rounded border border-primary/30 px-2 py-1" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">新密码</label>
            <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} className="w-full rounded border border-primary/30 px-2 py-1" />
          </div>
          <button type="submit" className="bg-primary text-white rounded px-3 py-2 text-xs">确认修改</button>
        </form>
        {msg && <div className="text-xs text-gray-600 mt-1">{msg}</div>}
      </section>
    </div>
  )
}