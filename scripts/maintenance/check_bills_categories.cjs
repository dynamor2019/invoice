const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const DB_PATH = path.join(__dirname, '../../server/data/app.db')

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('打开数据库失败:', err.message)
    process.exit(1)
  }
})

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })
}

async function checkBills() {
  try {
    // 查看所有票据的分类
    const bills = await all(`
      SELECT id, title, amount, category, date, createdBy, status
      FROM bills
      ORDER BY date DESC
      LIMIT 20
    `)
    
    console.log(`📋 最近20个票据:\n`)
    
    if (bills.length === 0) {
      console.log('数据库中没有票据')
      db.close()
      return
    }

    bills.forEach((bill, index) => {
      console.log(`${index + 1}. ${bill.title}`)
      console.log(`   分类: ${bill.category}`)
      console.log(`   金额: ¥${bill.amount}`)
      console.log(`   状态: ${bill.status}`)
      console.log(`   创建人: ${bill.createdBy}`)
      console.log()
    })

    // 统计分类
    const categories = await all(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM bills
      GROUP BY category
      ORDER BY count DESC
    `)
    
    console.log(`\n📊 分类统计:\n`)
    categories.forEach(cat => {
      console.log(`  ${cat.category}: ${cat.count} 个`)
    })

    // 查看事由分类
    const reasonCategories = await all(`
      SELECT id, name FROM reason_categories ORDER BY sort ASC
    `)
    
    console.log(`\n🏷️  事由分类:\n`)
    reasonCategories.forEach(cat => {
      console.log(`  ${cat.name}`)
    })

    db.close()
  } catch (e) {
    console.error('查询失败:', e.message)
    db.close()
    process.exit(1)
  }
}

checkBills()
