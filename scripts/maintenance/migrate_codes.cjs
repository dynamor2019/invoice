const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'server', 'data', 'app.db')
const db = new sqlite3.Database(dbPath)

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err)
      else resolve({ id: this.lastID, changes: this.changes })
    })
  })
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

async function migrateProjectCodes() {
  console.log('开始迁移项目编号...')
  
  // 获取所有项目，按创建时间排序
  const projects = await all(`SELECT id, name, code, createdAt FROM projects ORDER BY createdAt ASC`)
  
  if (projects.length === 0) {
    console.log('没有需要迁移的项目')
    return 0
  }
  
  let updated = 0
  const dayCounters = {} // 用于跟踪每天的序号
  
  for (const project of projects) {
    // 解析创建时间
    const createdDate = new Date(project.createdAt)
    const year = createdDate.getFullYear()
    const month = String(createdDate.getMonth() + 1).padStart(2, '0')
    const date = String(createdDate.getDate()).padStart(2, '0')
    const dayKey = `${year}-${month}-${date}`
    
    // 初始化或递增该天的计数器
    if (!dayCounters[dayKey]) {
      dayCounters[dayKey] = 1
    } else {
      dayCounters[dayKey]++
    }
    
    // 生成新的项目编号 HN-year-month-date-000
    const newCode = `HN-${year}-${month}-${date}-${String(dayCounters[dayKey]).padStart(3, '0')}`
    
    // 只有当编号不同时才更新
    if (project.code !== newCode) {
      await run(`UPDATE projects SET code = ? WHERE id = ?`, [newCode, project.id])
      console.log(`项目 "${project.name}" 编号从 "${project.code}" 更新为 "${newCode}"`)
      updated++
    }
  }
  
  console.log(`项目编号迁移完成，更新了 ${updated} 个项目`)
  return updated
}

async function migrateContractCodes() {
  console.log('开始迁移合同编号...')
  
  // 获取所有合同，按创建时间排序
  const contracts = await all(`SELECT id, contractNo, contractName, createdAt FROM supplier_contracts ORDER BY createdAt ASC`)
  
  if (contracts.length === 0) {
    console.log('没有需要迁移的合同')
    return 0
  }
  
  let updated = 0
  const dayCounters = {} // 用于跟踪每天的序号
  
  for (const contract of contracts) {
    // 解析创建时间
    const createdDate = new Date(contract.createdAt)
    const year = createdDate.getFullYear()
    const month = String(createdDate.getMonth() + 1).padStart(2, '0')
    const date = String(createdDate.getDate()).padStart(2, '0')
    const dayKey = `${year}-${month}-${date}`
    
    // 初始化或递增该天的计数器
    if (!dayCounters[dayKey]) {
      dayCounters[dayKey] = 1
    } else {
      dayCounters[dayKey]++
    }
    
    // 生成新的合同编号 HN-CG-year-month-date-000
    const newContractNo = `HN-CG-${year}-${month}-${date}-${String(dayCounters[dayKey]).padStart(3, '0')}`
    
    // 只有当编号不同时才更新
    if (contract.contractNo !== newContractNo) {
      await run(`UPDATE supplier_contracts SET contractNo = ? WHERE id = ?`, [newContractNo, contract.id])
      console.log(`合同 "${contract.contractName}" 编号从 "${contract.contractNo}" 更新为 "${newContractNo}"`)
      updated++
    }
  }
  
  console.log(`合同编号迁移完成，更新了 ${updated} 个合同`)
  return updated
}

async function main() {
  try {
    console.log('=== 编号格式迁移工具 ===')
    console.log('新格式：')
    console.log('- 项目编号：HN-年-月-日-序号 (如：HN-2025-12-26-001)')
    console.log('- 合同编号：HN-CG-年-月-日-序号 (如：HN-CG-2025-12-26-001)')
    console.log('')
    
    const projectsUpdated = await migrateProjectCodes()
    console.log('')
    const contractsUpdated = await migrateContractCodes()
    
    console.log('')
    console.log('=== 迁移完成 ===')
    console.log(`总计更新：${projectsUpdated + contractsUpdated} 条记录`)
    console.log(`- 项目：${projectsUpdated} 个`)
    console.log(`- 合同：${contractsUpdated} 个`)
    
  } catch (error) {
    console.error('迁移失败:', error)
  } finally {
    db.close()
  }
}

main()