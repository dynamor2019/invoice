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

// 创建测试合同
async function createTestContract(token, projectId) {
  const testContract = {
    projectId: projectId,
    contractName: '测试合同 - 自动编号验证',
    supplierName: '测试供应商有限公司',
    contractAmount: 50000,
    paymentMethod: '30%预付，60%到货，10%验收',
    materialList: JSON.stringify([
      { name: '测试材料1', quantity: 10, unitPrice: 100 },
      { name: '测试材料2', quantity: 5, unitPrice: 200 }
    ])
  }

  const res = await fetch(`${API_BASE}/supplier-contracts`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(testContract)
  })
  
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`创建合同失败: ${data.error}`)
  }
  
  return data
}

// 获取合同列表
async function getContracts(token) {
  const res = await fetch(`${API_BASE}/supplier-contracts`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`获取合同列表失败: ${data.error}`)
  }
  
  return data
}

async function main() {
  try {
    console.log('=== 测试新合同编号生成功能 ===')
    console.log('')
    
    // 1. 登录
    console.log('1. 正在登录...')
    const token = await login()
    console.log('✅ 登录成功')
    
    // 2. 获取项目列表
    console.log('')
    console.log('2. 获取项目列表...')
    const projects = await getProjects(token)
    if (projects.length === 0) {
      throw new Error('没有可用的项目，请先创建项目')
    }
    const testProject = projects[0]
    console.log(`选择项目: ${testProject.name} (ID: ${testProject.id})`)
    
    // 3. 获取当前合同列表
    console.log('')
    console.log('3. 获取当前合同列表...')
    const beforeContracts = await getContracts(token)
    console.log(`当前合同数量: ${beforeContracts.length}`)
    beforeContracts.forEach(c => {
      console.log(`  - ${c.contractName} (编号: ${c.contractNo})`)
    })
    
    // 4. 创建新合同
    console.log('')
    console.log('4. 创建测试合同...')
    const newContract = await createTestContract(token, testProject.id)
    console.log('✅ 合同创建成功!')
    console.log(`合同ID: ${newContract.id}`)
    console.log(`合同名称: ${newContract.contractName}`)
    console.log(`自动生成的合同编号: ${newContract.contractNo}`)
    console.log(`关联项目: ${testProject.name}`)
    
    // 5. 验证编号格式
    console.log('')
    console.log('5. 验证编号格式...')
    const contractCodePattern = /^HN-HT-\d{4}-\d{2}-\d{2}-\d{3}$/
    if (contractCodePattern.test(newContract.contractNo)) {
      console.log('✅ 合同编号格式正确: ' + newContract.contractNo)
    } else {
      console.log('❌ 合同编号格式错误: ' + newContract.contractNo)
      console.log('期望格式: HN-HT-年-月-日-序号 (如: HN-HT-2025-12-28-001)')
    }
    
    // 6. 获取更新后的合同列表
    console.log('')
    console.log('6. 获取更新后的合同列表...')
    const afterContracts = await getContracts(token)
    console.log(`更新后合同数量: ${afterContracts.length}`)
    
    console.log('')
    console.log('=== 测试完成 ===')
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    process.exit(1)
  }
}

main()