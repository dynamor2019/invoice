const fetch = require('node-fetch')

const API_BASE = 'http://127.0.0.1:6666/api'

// 需要添加的用户
const users = [
  { id: 'chairman1', name: '董事长', role: 'chairman', password: '123456' },
  { id: 'vice_chairman1', name: '副董事长', role: 'vice_chairman', password: '123456' },
  { id: 'gm1', name: '总经理', role: 'gm', password: '123456' },
  { id: 'finance1', name: '财务主管', role: 'finance_manager', password: '123456' },
  { id: 'cost1', name: '造价经理', role: 'cost_manager', password: '123456' },
  { id: 'pm1', name: '项目经理', role: 'project_manager', password: '123456' }
]

async function addUsers() {
  try {
    console.log('开始添加用户...')
    
    // 先登录获取token
    const loginResponse = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'admin', password: 'admin' })
    })
    
    if (!loginResponse.ok) {
      console.log('管理员登录失败，尝试其他用户...')
      return
    }
    
    const loginData = await loginResponse.json()
    const token = loginData.token
    
    console.log('登录成功，开始添加用户')
    
    for (const user of users) {
      try {
        const response = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(user)
        })
        
        if (response.ok) {
          console.log(`✓ 添加用户成功: ${user.name} (${user.id})`)
        } else {
          const error = await response.text()
          console.log(`✗ 添加用户失败: ${user.name} - ${error}`)
        }
      } catch (e) {
        console.log(`✗ 添加用户异常: ${user.name} - ${e.message}`)
      }
    }
    
    // 更新proc1用户
    try {
      const updateResponse = await fetch(`${API_BASE}/users/proc1`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: '采购经理', 
          role: 'procurement_manager' 
        })
      })
      
      if (updateResponse.ok) {
        console.log('✓ 更新proc1为采购经理成功')
      } else {
        console.log('✗ 更新proc1失败')
      }
    } catch (e) {
      console.log(`✗ 更新proc1异常: ${e.message}`)
    }
    
    console.log('用户添加完成')
    
  } catch (error) {
    console.error('添加用户失败:', error)
  }
}

addUsers()