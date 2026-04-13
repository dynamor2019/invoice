const sqlite3 = require('sqlite3').verbose()
const crypto = require('crypto')
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

async function addTestMaterials() {
  try {
    console.log('开始添加测试材料数据...')
    
    // 获取第一个项目ID
    const projects = await all(`SELECT id FROM projects LIMIT 1`)
    if (projects.length === 0) {
      console.log('没有找到项目，请先运行 add_data.cjs')
      return
    }
    
    const projectId = projects[0].id
    const now = new Date().toISOString()
    
    // 测试材料数据
    const testMaterials = [
      {
        name: '钢筋',
        specification: 'HRB400 φ12',
        unit: '吨',
        quantity: 10,
        unitPrice: 4500,
        totalPrice: 45000,
        supplier: '钢材供应商A',
        type: '材料清单',
        remarks: '主体结构用'
      },
      {
        name: '钢筋',
        specification: 'HRB400 φ16',
        unit: '吨',
        quantity: 8,
        unitPrice: 4600,
        totalPrice: 36800,
        supplier: '钢材供应商A',
        type: '材料清单',
        remarks: '主体结构用'
      },
      {
        name: '钢板',
        specification: 'Q235B 10mm',
        unit: '张',
        quantity: 50,
        unitPrice: 800,
        totalPrice: 40000,
        supplier: '钢材供应商B',
        type: '材料清单',
        remarks: '基础钢板'
      },
      {
        name: '混凝土',
        specification: 'C30',
        unit: '立方米',
        quantity: 100,
        unitPrice: 350,
        totalPrice: 35000,
        supplier: '混凝土供应商',
        type: '材料清单',
        remarks: '基础浇筑用'
      },
      {
        name: '混凝土',
        specification: 'C40',
        unit: '立方米',
        quantity: 50,
        unitPrice: 380,
        totalPrice: 19000,
        supplier: '混凝土供应商',
        type: '材料清单',
        remarks: '高强度混凝土'
      },
      {
        name: '电缆',
        specification: 'YJV 3×120+1×70',
        unit: '米',
        quantity: 200,
        unitPrice: 45,
        totalPrice: 9000,
        supplier: '电缆供应商',
        type: '施工清单',
        remarks: '主线路敷设'
      },
      {
        name: '电缆',
        specification: 'YJV 3×95+1×50',
        unit: '米',
        quantity: 150,
        unitPrice: 38,
        totalPrice: 5700,
        supplier: '电缆供应商',
        type: '施工清单',
        remarks: '分支线路'
      },
      {
        name: '变压器',
        specification: '630kVA 10/0.4kV',
        unit: '台',
        quantity: 1,
        unitPrice: 180000,
        totalPrice: 180000,
        supplier: '变压器厂',
        type: '材料清单',
        remarks: '主变压器'
      },
      {
        name: '开关柜',
        specification: 'KYN28-12',
        unit: '面',
        quantity: 6,
        unitPrice: 25000,
        totalPrice: 150000,
        supplier: '开关设备厂',
        type: '材料清单',
        remarks: '高压开关柜'
      },
      {
        name: '配电箱',
        specification: 'GGD型',
        unit: '台',
        quantity: 3,
        unitPrice: 8000,
        totalPrice: 24000,
        supplier: '配电设备厂',
        type: '施工清单',
        remarks: '低压配电'
      },
      {
        name: '调试设备',
        specification: '继电保护测试仪',
        unit: '台',
        quantity: 1,
        unitPrice: 50000,
        totalPrice: 50000,
        supplier: '测试设备厂',
        type: '调试清单',
        remarks: '保护调试用'
      },
      {
        name: '调试工具',
        specification: '万用表套装',
        unit: '套',
        quantity: 2,
        unitPrice: 1500,
        totalPrice: 3000,
        supplier: '仪表供应商',
        type: '调试清单',
        remarks: '现场调试工具'
      }
    ]
    
    // 添加材料到数据库
    for (const material of testMaterials) {
      const id = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
      
      await run(`INSERT INTO materials (
        id, projectId, name, specification, unit, quantity, unitPrice, totalPrice, 
        remarks, supplier, type, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        id, projectId, material.name, material.specification, material.unit,
        material.quantity, material.unitPrice, material.totalPrice,
        material.remarks, material.supplier, material.type, now, now
      ])
      
      console.log(`添加材料: ${material.name} - ${material.specification}`)
    }
    
    console.log(`成功添加 ${testMaterials.length} 个测试材料到项目 ${projectId}`)
    
  } catch (error) {
    console.error('添加测试材料失败:', error)
  } finally {
    db.close()
  }
}

addTestMaterials()