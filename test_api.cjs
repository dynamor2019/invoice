const fetch = require('node-fetch')

async function testAPI() {
  try {
    console.log('测试 /api/users 端点...')
    const response = await fetch('http://127.0.0.1:6666/api/users')
    
    if (response.ok) {
      const users = await response.json()
      console.log('API返回的用户数据:')
      console.table(users)
      
      console.log('\n重要用户角色:')
      const importantUsers = users.filter(u => 
        ['chairman', 'vice_chairman', 'gm', 'finance_manager', 'cost_manager', 'project_manager'].includes(u.role)
      )
      console.table(importantUsers)
      
    } else {
      console.log('API请求失败:', response.status, response.statusText)
    }
  } catch (error) {
    console.error('测试失败:', error)
  }
}

testAPI()