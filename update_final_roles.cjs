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

async function updateFinalRoles() {
  try {
    console.log('最终角色调整...')
    
    // 1. 将会计改为财务经理
    await run(`UPDATE users SET name = '财务经理', role = 'finance_manager' WHERE id = 'accountant'`)
    console.log('✓ 会计 -> 财务经理')
    
    // 2. 删除重复的财务主管
    await run(`DELETE FROM users WHERE id = 'finance1'`)
    console.log('✓ 删除重复的财务主管')
    
    // 3. 添加采购经理（如果不存在）
    const existingProc = await all(`SELECT id FROM users WHERE role = 'procurement_manager'`)
    if (existingProc.length === 0) {
      await run(`INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)`, 
        ['proc1', '采购经理', 'procurement_manager', '123456'])
      console.log('✓ 添加采购经理')
    } else {
      console.log('- 采购经理已存在')
    }
    
    console.log('\n最终用户列表（按登录顺序）:')
    const finalUsers = await all(`SELECT id, name, role FROM users ORDER BY 
      CASE 
        WHEN role = 'admin' THEN 1
        WHEN role = 'chairman' THEN 2
        WHEN role = 'vice_chairman' THEN 3  
        WHEN role = 'gm' THEN 4
        WHEN role = 'project_manager' THEN 5
        WHEN role = 'procurement_manager' THEN 6
        WHEN role = 'cost_manager' THEN 7
        WHEN role = 'finance_manager' THEN 8
        ELSE 9
      END, id`)
    console.table(finalUsers)
    
    console.log('\n登录界面显示顺序:')
    console.log('1. 管理员 (admin)')
    console.log('2. 李总 (approver3) - 董事长')
    console.log('3. 孙总 (approver2) - 副董事长')
    console.log('4. 李长春 (approver1) - 总经理')
    console.log('5. 项目经理 (pm1)')
    console.log('6. 采购经理 (proc1)')
    console.log('7. 造价经理 (cost1)')
    console.log('8. 财务经理 (accountant)')
    console.log('9. 其他用户...')
    
  } catch (error) {
    console.error('操作失败:', error)
  } finally {
    db.close()
  }
}

updateFinalRoles()