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

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err)
      resolve(this)
    })
  })
}

async function checkDuplicates() {
  try {
    // 查看所有用户
    const users = await all(`SELECT id, name, role FROM users ORDER BY role, id`)
    
    console.log('📋 所有用户列表:\n')
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.name} (ID: ${u.id}, 角色: ${u.role})`)
    })

    // 检查重复
    const roleCount = {}
    users.forEach(u => {
      if (!roleCount[u.role]) roleCount[u.role] = 0
      roleCount[u.role]++
    })

    console.log('\n📊 角色统计:\n')
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`  ${role}: ${count} 个`)
    })

    // 查找重复的角色
    const duplicates = Object.entries(roleCount).filter(([_, count]) => count > 1)
    
    if (duplicates.length > 0) {
      console.log('\n⚠️  发现重复的角色:')
      duplicates.forEach(([role, count]) => {
        const roleUsers = users.filter(u => u.role === role)
        console.log(`\n  ${role} (${count}个):`)
        roleUsers.forEach(u => {
          console.log(`    - ${u.name} (${u.id})`)
        })
      })

      // 询问是否删除重复
      console.log('\n💡 建议: 保留第一个，删除其他重复的')
      
      // 自动删除重复（保留第一个）
      for (const [role, count] of duplicates) {
        if (count > 1) {
          const roleUsers = users.filter(u => u.role === role)
          for (let i = 1; i < roleUsers.length; i++) {
            const userId = roleUsers[i].id
            console.log(`\n删除重复用户: ${roleUsers[i].name} (${userId})`)
            await run(`DELETE FROM users WHERE id = ?`, [userId])
          }
        }
      }

      console.log('\n✅ 已清理重复用户')
    } else {
      console.log('\n✅ 没有发现重复的角色')
    }

    db.close()
  } catch (e) {
    console.error('操作失败:', e.message)
    db.close()
    process.exit(1)
  }
}

checkDuplicates()
