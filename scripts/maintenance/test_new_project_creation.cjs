const { default: fetch } = require('node-fetch')

const API_BASE = 'http://localhost:5173/api'

// 模拟登录获取token
async function login() {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'admin', password: 'admin123' })
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`登录失败: ${data.error}`)
  }
  return data.token
}

// 创建测试项目
async function createTestProject(token) {
  const testProject = {
    name: '测试项目 - 自动编号验证',
    client: '测试客户公司',
    contractNo: '', // 让系统自动生成
    totalBudget: 100000,
    projectOverview: '这是一个测试项目，用于验证自动编号生成功能',
    projectManager: '测试项目经理',
    paymentMethod: '30%预付，70%验收',
    description: '测试项目描述'
  }

  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(testProject)
  })
  
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`创建项目失败: ${data.error}`)
  }
  
  return data
}

// 获取项目列表
async function getProjects(token) {
  const res = await fetch(`${API_BASE}/projects`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`获取项目列表失败: ${data.error}`)
  }
  
  return data
}

async function main() {
  try {
    console.log('=== 测试新项目编号生成功能 ===')
    console.log('')
    
    // 1. 登录
    console.log('1. 正在登录...')
    const token = await login()
    console.log('✅ 登录成功')
    
    // 2. 获取当前项目列表
    console.log('')
    console.log('2. 获取当前项目列表...')
    const beforeProjects = await getProjects(token)
    console.log(`当前项目数量: ${beforeProjects.length}`)
    beforeProjects.forEach(p => {
      console.log(`  - ${p.name} (编号: ${p.code})`)
    })
    
    // 3. 创建新项目
    console.log('')
    console.log('3. 创建测试项目...')
    const newProject = await createTestProject(token)
    console.log('✅ 项目创建成功!')
    console.log(`项目ID: ${newProject.id}`)
    console.log(`项目名称: ${newProject.name}`)
    console.log(`自动生成的项目编号: ${newProject.code}`)
    console.log(`合同编号: ${newProject.contractNo || '未设置'}`)
    
    // 4. 验证编号格式
    console.log('')
    console.log('4. 验证编号格式...')
    const codePattern = /^HN-\d{4}-\d{2}-\d{2}-\d{3}$/
    if (codePattern.test(newProject.code)) {
      console.log('✅ 项目编号格式正确: ' + newProject.code)
    } else {
      console.log('❌ 项目编号格式错误: ' + newProject.code)
      console.log('期望格式: HN-年-月-日-序号 (如: HN-2025-12-28-001)')
    }
    
    // 5. 获取更新后的项目列表
    console.log('')
    console.log('5. 获取更新后的项目列表...')
    const afterProjects = await getProjects(token)
    console.log(`更新后项目数量: ${afterProjects.length}`)
    
    console.log('')
    console.log('=== 测试完成 ===')
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    process.exit(1)
  }
}

main()