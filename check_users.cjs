const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'server/data/app.db')
const db = new sqlite3.Database(dbPath)

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

async function checkUsers() {
  try {
    console.log('当前数据库中的用户:')
    const users = await all(`SELECT id, name, role FROM users`)
    console.table(users)
    
    console.log('\n当前数据库中的表:')
    const tables = await all(`SELECT name FROM sqlite_master WHERE type='table'`)
    console.table(tables)
    
  } catch (error) {
    console.error('查询失败:', error)
  } finally {
    db.close()
  }
}

checkUsers()