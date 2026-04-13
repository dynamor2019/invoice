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

async function fixMaterialCategories() {
  try {
    console.log('开始修正材料分类...')
    
    // 根据材料名称和用途重新分类
    const categoryMappings = [
      // 主要设备 -> 材料清单
      { oldType: '主要设备', newType: '材料清单' },
      
      // 辅助材料 -> 材料清单  
      { oldType: '辅助材料', newType: '材料清单' },
      
      // 辅助设备 -> 材料清单
      { oldType: '辅助设备', newType: '材料清单' },
      
      // 根据材料名称进行更精确的分类
      // 施工相关的材料
      { namePattern: '%基础%', newType: '施工清单' },
      { namePattern: '%安装%', newType: '施工清单' },
      { namePattern: '%施工%', newType: '施工清单' },
      { namePattern: '%拉管%', newType: '施工清单' },
      { namePattern: '%围挡%', newType: '施工清单' },
      { namePattern: '%放电缆%', newType: '施工清单' },
      { namePattern: '%制作电缆头%', newType: '施工清单' },
      { namePattern: '%标桩%', newType: '施工清单' },
      
      // 调试相关的材料
      { namePattern: '%调试%', newType: '调试清单' },
      { namePattern: '%试验%', newType: '调试清单' },
      { namePattern: '%不间断电源%', newType: '调试清单' },
      { namePattern: '%接地装置%', newType: '调试清单' },
      { namePattern: '%电力变压器系统%', newType: '调试清单' },
      { namePattern: '%电容器%', newType: '调试清单' },
      { namePattern: '%送配电装置%', newType: '调试清单' },
      { namePattern: '%避雷器%', newType: '调试清单' }
    ]
    
    // 1. 先按照旧分类进行批量更新
    for (const mapping of categoryMappings) {
      if (mapping.oldType) {
        const result = await run(
          `UPDATE materials SET type = ? WHERE type = ?`,
          [mapping.newType, mapping.oldType]
        )
        console.log(`更新分类 ${mapping.oldType} -> ${mapping.newType}: ${result.changes} 条记录`)
      }
    }
    
    // 2. 根据材料名称进行精确分类
    for (const mapping of categoryMappings) {
      if (mapping.namePattern) {
        const result = await run(
          `UPDATE materials SET type = ? WHERE name LIKE ?`,
          [mapping.newType, mapping.namePattern]
        )
        console.log(`按名称更新分类 ${mapping.namePattern} -> ${mapping.newType}: ${result.changes} 条记录`)
      }
    }
    
    // 3. 显示最终的分类统计
    const stats = await all(`
      SELECT type, COUNT(*) as count 
      FROM materials 
      GROUP BY type 
      ORDER BY type
    `)
    
    console.log('\n最终分类统计:')
    stats.forEach(stat => {
      console.log(`${stat.type}: ${stat.count} 个材料`)
    })
    
    // 4. 显示一些示例材料及其分类
    console.log('\n示例材料分类:')
    const samples = await all(`
      SELECT name, type 
      FROM materials 
      WHERE name LIKE '%630%' OR name LIKE '%箱变%' OR name LIKE '%调试%'
      ORDER BY type, name
      LIMIT 10
    `)
    
    samples.forEach(sample => {
      console.log(`${sample.name} -> ${sample.type}`)
    })
    
    console.log('\n材料分类修正完成！')
    
  } catch (error) {
    console.error('修正材料分类失败:', error)
  } finally {
    db.close()
  }
}

fixMaterialCategories()