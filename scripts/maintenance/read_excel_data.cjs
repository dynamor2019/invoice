const XLSX = require('xlsx')
const sqlite3 = require('sqlite3').verbose()
const crypto = require('crypto')
const path = require('path')

const excelPath = path.join(__dirname, 'server/成本-先进金属基复合材料研发及产业化项目630kVA临时基建箱变工程-2025.12.05.xlsx')
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

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
}

async function readExcelAndUpdateProject() {
  try {
    console.log('读取Excel文件:', excelPath)
    
    // 读取Excel文件
    const workbook = XLSX.readFile(excelPath)
    console.log('工作表名称:', workbook.SheetNames)
    
    // 读取第一个工作表
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    
    console.log('Excel数据预览:')
    console.log('总行数:', data.length)
    
    // 显示前10行数据
    for (let i = 0; i < Math.min(10, data.length); i++) {
      console.log(`第${i+1}行:`, data[i])
    }
    
    // 查找项目数据
    const projects = await all(`SELECT id FROM projects WHERE name LIKE '%先进金属%'`)
    if (projects.length === 0) {
      console.log('未找到先进金属项目，请先创建项目')
      return
    }
    
    const projectId = projects[0].id
    console.log('找到项目ID:', projectId)
    
    // 清空现有材料数据
    await run(`DELETE FROM materials WHERE projectId = ?`, [projectId])
    console.log('清空现有材料数据')
    
    // 解析Excel数据并插入材料清单
    const now = new Date().toISOString()
    let materialCount = 0
    
    // 假设Excel格式：序号、名称、规格、单位、数量、单价、总价、备注
    // 跳过标题行，从第2行开始
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length < 4) continue // 跳过空行或数据不完整的行
      
      // 尝试解析数据
      const serialNumber = String(row[0] || '').trim()
      const name = String(row[1] || '').trim()
      const specification = String(row[2] || '').trim()
      const unit = String(row[3] || '').trim()
      const quantity = parseFloat(row[4]) || 0
      const unitPrice = parseFloat(row[5]) || 0
      const totalPrice = parseFloat(row[6]) || (quantity * unitPrice)
      const remarks = String(row[7] || '').trim()
      
      // 跳过无效数据
      if (!name || name === '名称' || name === '项目' || name.includes('合计')) continue
      
      const materialId = generateId()
      
      try {
        await run(`INSERT INTO materials (
          id, projectId, serialNumber, name, specification, unit, quantity, 
          unitPrice, totalPrice, remarks, supplier, type, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          materialId, projectId, serialNumber || (materialCount + 1).toString().padStart(3, '0'), 
          name, specification, unit, quantity, unitPrice, totalPrice, remarks, 
          '待确定', '材料清单', now, now
        ])
        
        materialCount++
        console.log(`✓ 添加材料: ${name} - ${specification}`)
        
      } catch (e) {
        console.log(`✗ 添加材料失败: ${name} - ${e.message}`)
      }
    }
    
    console.log(`\n成功导入 ${materialCount} 个材料项目`)
    
    // 显示导入的材料汇总
    const materials = await all(`SELECT name, specification, unit, quantity, unitPrice, totalPrice FROM materials WHERE projectId = ?`, [projectId])
    console.log('\n导入的材料清单:')
    console.table(materials)
    
    // 计算总金额
    const totalAmount = materials.reduce((sum, m) => sum + (m.totalPrice || 0), 0)
    console.log(`\n材料总金额: ${totalAmount.toLocaleString()} 元`)
    
  } catch (error) {
    console.error('读取Excel失败:', error)
  } finally {
    db.close()
  }
}

readExcelAndUpdateProject()