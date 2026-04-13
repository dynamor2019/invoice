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

async function updateUserRoles() {
  try {
    console.log('更新用户角色映射...')
    
    // 根据您的说明更新用户角色
    const roleUpdates = [
      { id: 'approver3', name: '李总', role: 'chairman' },        // 董事长
      { id: 'approver2', name: '孙总', role: 'vice_chairman' },   // 副董事长  
      { id: 'approver1', name: '李长春', role: 'gm' }             // 总经理
    ]
    
    console.log('开始更新用户角色...')
    
    for (const update of roleUpdates) {
      try {
        // 检查用户是否存在
        const existing = await all(`SELECT id, name, role FROM users WHERE id = ?`, [update.id])
        if (existing.length > 0) {
          await run(`UPDATE users SET role = ? WHERE id = ?`, [update.role, update.id])
          console.log(`✓ 更新用户: ${update.name} (${update.id}) -> ${update.role}`)
        } else {
          console.log(`✗ 用户不存在: ${update.id}`)
        }
      } catch (e) {
        console.log(`✗ 更新用户失败: ${update.name} - ${e.message}`)
      }
    }
    
    // 删除之前添加的重复用户
    const duplicateUsers = ['chairman1', 'vice_chairman1', 'gm1']
    console.log('\n删除重复的用户...')
    
    for (const userId of duplicateUsers) {
      try {
        await run(`DELETE FROM users WHERE id = ?`, [userId])
        console.log(`✓ 删除重复用户: ${userId}`)
      } catch (e) {
        console.log(`- 用户可能不存在: ${userId}`)
      }
    }
    
    console.log('\n最终用户列表:')
    const finalUsers = await all(`SELECT id, name, role FROM users ORDER BY 
      CASE role 
        WHEN 'chairman' THEN 1
        WHEN 'vice_chairman' THEN 2  
        WHEN 'gm' THEN 3
        WHEN 'finance_manager' THEN 4
        WHEN 'cost_manager' THEN 5
        WHEN 'project_manager' THEN 6
        WHEN 'procurement_manager' THEN 7
        WHEN 'accountant' THEN 8
        WHEN 'admin' THEN 9
        ELSE 10
      END, id`)
    console.table(finalUsers)
    
    console.log('\n角色更新完成！')
    console.log('现在的组织架构:')
    console.log('- 董事长: 李总 (approver3)')
    console.log('- 副董事长: 孙总 (approver2)')  
    console.log('- 总经理: 李长春 (approver1)')
    console.log('- 财务主管: 财务主管 (finance1)')
    console.log('- 造价经理: 造价经理 (cost1)')
    console.log('- 项目经理: 项目经理 (pm1)')
    
  } catch (error) {
    console.error('操作失败:', error)
  } finally {
    db.close()
  }
}

updateUserRoles()