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

async function addMissingUsers() {
  try {
    console.log('检查现有用户...')
    const existingUsers = await all(`SELECT id, name, role FROM users`)
    console.log('现有用户:')
    console.table(existingUsers)
    
    const existingIds = existingUsers.map(u => u.id)
    
    // 只添加不存在的用户
    const newUsers = [
      { id: 'chairman1', name: '董事长', role: 'chairman', password: '123456' },
      { id: 'vice_chairman1', name: '副董事长', role: 'vice_chairman', password: '123456' },
      { id: 'gm1', name: '总经理', role: 'gm', password: '123456' },
      { id: 'finance1', name: '财务主管', role: 'finance_manager', password: '123456' },
      { id: 'cost1', name: '造价经理', role: 'cost_manager', password: '123456' },
      { id: 'pm1', name: '项目经理', role: 'project_manager', password: '123456' }
    ]
    
    console.log('\n开始添加缺失的用户...')
    
    for (const user of newUsers) {
      if (!existingIds.includes(user.id)) {
        try {
          await run(`INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)`, 
            [user.id, user.name, user.role, user.password])
          console.log(`✓ 添加新用户: ${user.name} (${user.id})`)
        } catch (e) {
          console.log(`✗ 添加用户失败: ${user.name} - ${e.message}`)
        }
      } else {
        console.log(`- 用户已存在，跳过: ${user.id}`)
      }
    }
    
    console.log('\n最终用户列表:')
    const finalUsers = await all(`SELECT id, name, role FROM users ORDER BY id`)
    console.table(finalUsers)
    
    console.log('\n用户添加完成！现在您可以在登录页面看到这些用户了。')
    
  } catch (error) {
    console.error('操作失败:', error)
  } finally {
    db.close()
  }
}

addMissingUsers()