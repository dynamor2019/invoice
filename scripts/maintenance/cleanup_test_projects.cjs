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

async function cleanup() {
  try {
    // 查找所有test开头的项目
    const testProjects = await all(`SELECT id, name FROM projects WHERE name LIKE 'test%' OR name LIKE 'TEST%'`)
    
    if (testProjects.length === 0) {
      console.log('没有找到test开头的项目')
      db.close()
      return
    }

    console.log(`找到 ${testProjects.length} 个test项目:`)
    testProjects.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`))

    // 删除这些项目及其关联数据
    for (const project of testProjects) {
      console.log(`\n删除项目: ${project.name}`)
      
      // 删除材料
      await run(`DELETE FROM materials WHERE projectId = ?`, [project.id])
      console.log(`  ✓ 已删除关联的材料`)
      
      // 删除采购合同
      await run(`DELETE FROM supplier_contracts WHERE projectId = ?`, [project.id])
      console.log(`  ✓ 已删除关联的采购合同`)
      
      // 删除项目变更记录
      await run(`DELETE FROM project_changes WHERE projectId = ?`, [project.id])
      console.log(`  ✓ 已删除项目变更记录`)
      
      // 删除项目本身
      await run(`DELETE FROM projects WHERE id = ?`, [project.id])
      console.log(`  ✓ 已删除项目`)
    }

    console.log(`\n✅ 成功删除 ${testProjects.length} 个test项目及其所有关联数据`)
    db.close()
  } catch (e) {
    console.error('清理失败:', e.message)
    db.close()
    process.exit(1)
  }
}

cleanup()
