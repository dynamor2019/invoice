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

// 后勤相关的分类关键词
const LOGISTICS_KEYWORDS = [
  '菜金', '烟酒', '差旅', '运输', '服务费', '培训', '咨询',
  '后勤', '办公', '会议', '招待', '车辆', '维修', '清洁',
  '物业', '保安', '食堂', '宿舍', '宾馆', '住宿'
]

function isLogisticsBill(category) {
  return LOGISTICS_KEYWORDS.some(keyword => category.includes(keyword))
}

async function transferLogisticsBills() {
  try {
    // 查找所有后勤相关的票据
    const allBills = await all(`
      SELECT id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history
      FROM bills 
      ORDER BY date DESC
    `)
    
    const logisticsBills = allBills.filter(bill => isLogisticsBill(bill.category))
    
    if (logisticsBills.length === 0) {
      console.log('没有找到后勤相关的报销单')
      db.close()
      return
    }

    console.log(`找到 ${logisticsBills.length} 个后勤相关的报销单:\n`)
    
    let alreadyInWorkbench = 0
    let needsTransfer = 0
    
    for (const bill of logisticsBills) {
      console.log(`📄 ${bill.title}`)
      console.log(`   分类: ${bill.category}`)
      console.log(`   金额: ¥${bill.amount}`)
      console.log(`   状态: ${bill.status}`)
      
      // 安全地解析steps和history
      let steps = []
      let currentStepIndex = Number(bill.currentStepIndex) || 0
      let history = []
      
      if (bill.steps) {
        try {
          steps = typeof bill.steps === 'string' ? JSON.parse(bill.steps) : bill.steps
          if (!Array.isArray(steps)) steps = []
        } catch (e) {
          steps = []
        }
      }
      
      if (bill.history) {
        try {
          history = typeof bill.history === 'string' ? JSON.parse(bill.history) : bill.history
          if (!Array.isArray(history)) history = []
        } catch (e) {
          history = []
        }
      }
      
      const stepsStr = Array.isArray(steps) && steps.length > 0 ? steps.join(' → ') : '无'
      console.log(`   审批流程: ${stepsStr}`)
      
      if (bill.status === 'pending' && Array.isArray(steps) && steps.length > 0) {
        const currentRole = steps[currentStepIndex]
        console.log(`   当前步骤: ${currentRole}`)
        
        if (currentRole === 'vice_chairman') {
          console.log(`   ✓ 已在孙总(vice_chairman)的工作台`)
          alreadyInWorkbench++
        } else {
          console.log(`   ⚠️  需要转移到孙总工作台`)
          needsTransfer++
          
          // 后勤费用的审批流程应该是: vice_chairman → chairman
          const newSteps = ['vice_chairman', 'chairman']
          const newHistory = Array.isArray(history) ? [...history] : []
          newHistory.push({
            action: 'transfer',
            reason: '后勤费用转移到孙总工作台',
            time: new Date().toISOString()
          })
          
          await run(
            `UPDATE bills SET steps = ?, currentStepIndex = ?, history = ? WHERE id = ?`,
            [JSON.stringify(newSteps), 0, JSON.stringify(newHistory), bill.id]
          )
          console.log(`   ✓ 已转移`)
        }
      } else {
        console.log(`   ℹ️  状态为${bill.status}，不需要转移`)
      }
      
      console.log()
    }

    console.log(`\n📊 转移统计:`)
    console.log(`  总计: ${logisticsBills.length} 个后勤报销单`)
    console.log(`  已在孙总工作台: ${alreadyInWorkbench} 个`)
    console.log(`  已转移: ${needsTransfer} 个`)
    
    db.close()
  } catch (e) {
    console.error('操作失败:', e.message)
    console.error(e.stack)
    db.close()
    process.exit(1)
  }
}

transferLogisticsBills()
