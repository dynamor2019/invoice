// 直接通过API添加用户
const API_BASE = 'http://127.0.0.1:3001/api'

const users = [
  { id: 'chairman1', name: '董事长', role: 'chairman', password: '123456' },
  { id: 'vice_chairman1', name: '副董事长', role: 'vice_chairman', password: '123456' },
  { id: 'gm1', name: '总经理', role: 'gm', password: '123456' },
  { id: 'finance1', name: '财务主管', role: 'finance_manager', password: '123456' },
  { id: 'cost1', name: '造价经理', role: 'cost_manager', password: '123456' },
  { id: 'pm1', name: '项目经理', role: 'project_manager', password: '123456' }
]

async function addUsersViaAPI() {
  try {
    console.log('开始通过API添加用户...')
    
    // 先尝试用admin登录
    let token = null
    try {
      const loginResponse = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'admin', password: 'admin' })
      })
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json()
        token = loginData.token
        console.log('✓ 管理员登录成功')
      }
    } catch (e) {
      console.log('管理员登录失败，尝试其他方式')
    }
    
    // 如果没有token，尝试其他用户
    if (!token) {
      const testUsers = ['proc1', 'approver1', 'accountant']
      for (const testId of testUsers) {
        try {
          const loginResponse = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: testId, password: '123456' })
          })
          
          if (loginResponse.ok) {
            const loginData = await loginResponse.json()
            token = loginData.token
            console.log(`✓ 用户 ${testId} 登录成功`)
            break
          }
        } catch (e) {
          continue
        }
      }
    }
    
    if (!token) {
      console.log('无法获取认证token，直接操作数据库')
      return
    }
    
    // 添加用户
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
          console.log(`- 用户可能已存在: ${user.name} - ${error}`)
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
        console.log('- proc1用户可能不存在或已是正确角色')
      }
    } catch (e) {
      console.log(`- 更新proc1: ${e.message}`)
    }
    
    // 获取最终用户列表
    try {
      const usersResponse = await fetch(`${API_BASE}/users`)
      if (usersResponse.ok) {
        const usersList = await usersResponse.json()
        console.log('\n当前系统用户:')
        console.table(usersList)
      }
    } catch (e) {
      console.log('获取用户列表失败')
    }
    
  } catch (error) {
    console.error('操作失败:', error)
  }
}

// 执行添加用户
addUsersViaAPI()