const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const DB_PATH = path.join(__dirname, 'server', 'data', 'app.db')

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err)
      resolve(this)
    })
  })
}

async function updateProjectCodes() {
  console.log('开始更新项目编号格式...')
  
  const db = new sqlite3.Database(DB_PATH)
  
  try {
    // 获取所有项目，按创建时间排序
    const projects = await all(db, `SELECT id, name, code, createdAt FROM projects ORDER BY createdAt ASC`)
    
    if (projects.length === 0) {
      console.log('没有找到项目数据')
      return
    }
    
    console.log(`找到 ${projects.length} 个项目，开始更新编号...`)
    
    // 按日期分组计数器
    const dayCounters = {}
    let updated = 0
    
    for (const project of projects) {
      // 解析创建时间
      const createdAt = new Date(project.createdAt)
      const year = createdAt.getFullYear()
      const month = String(createdAt.getMonth() + 1).padStart(2, '0')
      const date = String(createdAt.getDate()).padStart(2, '0')
      
      // 生成日期键
      const dayKey = `${year}-${month}-${date}`
      
      // 初始化或递增计数器
      if (!dayCounters[dayKey]) {
        dayCounters[dayKey] = 1
      } else {
        dayCounters[dayKey]++
      }
      
      // 生成新的项目编号 HN-year-month-date-000
      const newCode = `HN-${year}-${month}-${date}-${String(dayCounters[dayKey]).padStart(3, '0')}`
      
      // 更新项目编号
      await run(db, `UPDATE projects SET code = ? WHERE id = ?`, [newCode, project.id])
      console.log(`项目 "${project.name}" 编号更新: ${project.code} → ${newCode}`)
      updated++
    }
    
    console.log(`项目编号更新完成，更新了 ${updated} 个项目`)
    return updated
    
  } catch (error) {
    console.error('更新项目编号时出错:', error)
    throw error
  } finally {
    db.close()
  }
}

async function updateContractCodes() {
  console.log('开始更新合同编号格式...')
  
  const db = new sqlite3.Database(DB_PATH)
  
  try {
    // 获取所有供应商合同，按创建时间排序
    const contracts = await all(db, `SELECT id, contractName, contractNo, createdAt FROM supplier_contracts ORDER BY createdAt ASC`)
    
    if (contracts.length === 0) {
      console.log('没有找到合同数据')
      return
    }
    
    console.log(`找到 ${contracts.length} 个合同，开始更新编号...`)
    
    // 按日期分组计数器
    const dayCounters = {}
    let updated = 0
    
    for (const contract of contracts) {
      // 解析创建时间
      const createdAt = new Date(contract.createdAt)
      const year = createdAt.getFullYear()
      const month = String(createdAt.getMonth() + 1).padStart(2, '0')
      const date = String(createdAt.getDate()).padStart(2, '0')
      
      // 生成日期键
      const dayKey = `${year}-${month}-${date}`
      
      // 初始化或递增计数器
      if (!dayCounters[dayKey]) {
        dayCounters[dayKey] = 1
      } else {
        dayCounters[dayKey]++
      }
      
      // 生成新的合同编号 HN-HT-year-month-date-000
      const newContractNo = `HN-HT-${year}-${month}-${date}-${String(dayCounters[dayKey]).padStart(3, '0')}`
      
      // 更新合同编号
      await run(db, `UPDATE supplier_contracts SET contractNo = ? WHERE id = ?`, [newContractNo, contract.id])
      console.log(`合同 "${contract.contractName}" 编号更新: ${contract.contractNo} → ${newContractNo}`)
      updated++
    }
    
    console.log(`合同编号更新完成，更新了 ${updated} 个合同`)
    return updated
    
  } catch (error) {
    console.error('更新合同编号时出错:', error)
    throw error
  } finally {
    db.close()
  }
}

async function main() {
  try {
    console.log('=== 编号格式更新工具 ===')
    console.log('新格式：')
    console.log('- 项目编号：HN-年-月-日-序号 (如：HN-2025-12-28-001)')
    console.log('- 合同编号：HN-HT-年-月-日-序号 (如：HN-HT-2025-12-28-001)')
    console.log('')
    
    await updateProjectCodes()
    console.log('')
    await updateContractCodes()
    
    console.log('')
    console.log('✅ 所有编号格式更新完成！')
    
  } catch (error) {
    console.error('❌ 更新过程中出现错误:', error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

module.exports = { updateProjectCodes, updateContractCodes }