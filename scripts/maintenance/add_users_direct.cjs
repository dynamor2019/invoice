const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'server/data/app.db')
const db = new sqlite3.Database(dbPath)

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err)
      else resolve(this)
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

async function addUsers() {
  try {
    console.log('检查当前用户...')
    const existingUsers = await all(`SELECT id, name, role FROM users`)
    console.log('现有用户:', existingUsers)
    
    const users = [
      { id: 'chairman1', name: '董事长', role: 'chairman', password: '123456' },
      { id: 'vice_chairman1', name: '副董事长', role: 'vice_chairman', password: '123456' },
      { id: 'gm1', name: '总经理', role: 'gm', password: '123456' },
      { id: 'finance1', name: '财务主管', role: 'finance_manager', password: '123456' },
      { id: 'cost1', name: '造价经理', role: 'cost_manager', password: '123456' },
      { id: 'pm1', name: '项目经理', role: 'project_manager', password: '123456' }
    ]
    
    console.log('开始添加用户...')
    
    for (const user of users) {
      try {
        // 检查用户是否已存在
        const existing = await all(`SELECT id FROM users WHERE id = ?`, [user.id])
        if (existing.length === 0) {
          await run(`INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)`, 
            [user.id, user.name, user.role, user.password])
          console.log(`✓ 添加用户: ${user.name} (${user.id})`)
        } else {
          console.log(`- 用户已存在: ${user.name} (${user.id})`)
        }
      } catch (e) {
        console.log(`✗ 添加用户失败: ${user.name} - ${e.message}`)
      }
    }
    
    // 更新proc1用户为采购经理
    try {
      const proc1 = await all(`SELECT id FROM users WHERE id = 'proc1'`)
      if (proc1.length > 0) {
        await run(`UPDATE users SET name = '采购经理', role = 'procurement_manager' WHERE id = 'proc1'`)
        console.log('✓ 更新proc1为采购经理')
      } else {
        // 如果proc1不存在，创建它
        await run(`INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)`, 
          ['proc1', '采购经理', 'procurement_manager', '123456'])
        console.log('✓ 创建proc1采购经理用户')
      }
    } catch (e) {
      console.log(`✗ 更新proc1失败: ${e.message}`)
    }
    
    console.log('\n最终用户列表:')
    const finalUsers = await all(`SELECT id, name, role FROM users`)
    console.table(finalUsers)
    
  } catch (error) {
    console.error('操作失败:', error)
  } finally {
    db.close()
  }
}

addUsers()