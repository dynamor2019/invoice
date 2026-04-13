const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const DB_PATH = path.join(__dirname, '../../server/data/app.db')

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('打开数据库失败:', err.message)
    process.exit(1)
  }
  console.log('已连接到数据库')
})

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err)
      resolve(this)
    })
  })
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })
}

async function transferLogisticsBills() {
  try {
    // 查找所有后勤相关的票据（分类或事由包含"后勤"）
    const logisticsBills = await all(`
      SELECT id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history
      FROM bills 
      WHERE category LIKE '%后勤%' OR category LIKE '%logistics%'
      ORDER BY date DESC
    `)
    
    if (logisticsBills.length === 0) {
      console.log('没有找到后勤相关的报销单')
      db.close()
      return
    }

    console.log(`找到 ${logisticsBills.length} 个后勤相关的报销单:\n`)
    
    let transferCount = 0
    
    for (const bill of logisticsBills) {
      console.log(`票据: ${bill.title}`)
      console.log(`  金额: ¥${bill.amount}`)
      console.log(`  分类: ${bill.category}`)
      console.log(`  状态: ${bill.status}`)
      console.log(`  创建人: ${bill.createdBy}`)
      
      // 解析steps和history
      let steps = []
      let history = []
      try {
        steps = Array.isArray(bill.steps) ? bill.steps : JSON.parse(bill.steps || '[]')
      } catch (e) {
        console.log(`  警告: 无法解析steps`)
      }
      try {
        history = Array.isArray(bill.history) ? bill.history : JSON.parse(bill.history || '[]')
      } catch (e) {
        console.log(`  警告: 无法解析history`)
      }
      
      console.log(`  审批流程: ${steps.join(' → ')}`)
      console.log(`  当前步骤: ${bill.currentStepIndex}/${steps.length}`)
      
      // 检查是否需要转移
      if (bill.status === 'pending') {
        const currentRole = steps[bill.currentStepIndex]
        console.log(`  ⚠️  待审批，当前需要: ${currentRole}`)
        
        // 如果当前步骤是vice_chairman，说明已经在孙总的工作台
        if (currentRole === 'vice_chairman') {
          console.log(`  ✓ 已在孙总(vice_chairman)的工作台`)
          transferCount++
        } else {
          console.log(`  ℹ️  需要先完成前面的审批步骤`)
        }
      } else {
        console.log(`  ℹ️  状态为${bill.status}，不需要转移`)
      }
      
      console.log()
    }

    console.log(`\n📊 统计:`)
    console.log(`  总计: ${logisticsBills.length} 个后勤报销单`)
    console.log(`  已在孙总工作台: ${transferCount} 个`)
    console.log(`  其他状态: ${logisticsBills.length - transferCount} 个`)
    
    db.close()
  } catch (e) {
    console.error('查询失败:', e.message)
    db.close()
    process.exit(1)
  }
}

transferLogisticsBills()
