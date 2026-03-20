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

async function addMissingData() {
  try {
    console.log('开始添加缺失的数据...')
    
    // 1. 检查并添加缺失的用户角色
    const existingUsers = await all(`SELECT id, role FROM users`)
    const existingRoles = existingUsers.map(u => u.role)
    
    const requiredUsers = [
      { id: 'chairman1', name: '董事长', role: 'chairman', password: '123456' },
      { id: 'vice_chairman1', name: '副董事长', role: 'vice_chairman', password: '123456' },
      { id: 'gm1', name: '总经理', role: 'gm', password: '123456' },
      { id: 'finance1', name: '财务主管', role: 'finance_manager', password: '123456' },
      { id: 'cost1', name: '造价经理', role: 'cost_manager', password: '123456' }
    ]
    
    for (const user of requiredUsers) {
      if (!existingRoles.includes(user.role)) {
        try {
          await run(`INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)`, 
            [user.id, user.name, user.role, user.password])
          console.log(`添加用户: ${user.name} (${user.role})`)
        } catch (e) {
          console.log(`用户 ${user.name} 可能已存在`)
        }
      }
    }
    
    // 2. 更新proc1用户为采购经理角色
    try {
      await run(`UPDATE users SET role = 'procurement_manager', name = '采购经理' WHERE id = 'proc1'`)
      console.log('更新proc1为采购经理')
    } catch (e) {
      console.log('proc1用户更新失败或不存在')
    }
    
    // 3. 检查并添加示例项目（如果没有项目的话）
    const existingProjects = await all(`SELECT COUNT(*) as count FROM projects`)
    if (existingProjects[0].count === 0) {
      const projectId = crypto.randomUUID ? crypto.randomUUID() : 'project-001'
      const now = new Date().toISOString()
      
      await run(`INSERT INTO projects (
        id, code, name, client, contractNo, totalBudget, balance, duration, 
        clientFinancialInfo, projectOverview, settlementAmount, paymentMethod, 
        invoiceInfo, approvalStatus, createdBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        projectId,
        'PROJ-2025-001',
        '先进金属基复合材料研发及产业化项目630kVA临时基建箱变工程',
        '某科技公司',
        'HT-2025-001',
        5000000,
        5000000,
        '12个月',
        '开户行：工商银行，账号：1234567890',
        '本项目为先进金属基复合材料研发及产业化项目的配套基础设施建设，主要包括630kVA临时基建箱变工程的设计、采购、安装及调试。',
        4800000,
        '分期付款',
        '增值税专用发票',
        'approved',
        'gm1',
        now,
        now
      ])
      console.log('添加示例项目')
    }
    
    // 4. 检查并添加示例供应商
    const existingSuppliers = await all(`SELECT COUNT(*) as count FROM suppliers`)
    if (existingSuppliers[0].count === 0) {
      const now = new Date().toISOString()
      const suppliers = [
        {
          id: crypto.randomUUID ? crypto.randomUUID() : 'supplier-001',
          name: '北京电力设备有限公司',
          contactPerson: '张经理',
          phone: '010-12345678',
          email: 'zhang@bjdl.com',
          address: '北京市朝阳区电力大厦',
          businessLicense: '91110000123456789X',
          taxNumber: '91110000123456789X',
          bankAccount: '工商银行 1234567890123456',
          category: '电力设备',
          status: 'active'
        },
        {
          id: crypto.randomUUID ? crypto.randomUUID() : 'supplier-002',
          name: '上海变压器制造厂',
          contactPerson: '李总',
          phone: '021-87654321',
          email: 'li@shbyq.com',
          address: '上海市浦东新区工业园区',
          businessLicense: '91310000987654321Y',
          taxNumber: '91310000987654321Y',
          bankAccount: '建设银行 9876543210987654',
          category: '变压器设备',
          status: 'active'
        }
      ]
      
      for (const supplier of suppliers) {
        await run(`INSERT INTO suppliers (
          id, name, contactPerson, phone, email, address, businessLicense, 
          taxNumber, bankAccount, category, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          supplier.id, supplier.name, supplier.contactPerson, supplier.phone,
          supplier.email, supplier.address, supplier.businessLicense,
          supplier.taxNumber, supplier.bankAccount, supplier.category,
          supplier.status, now, now
        ])
      }
      console.log('添加示例供应商')
    }
    
    // 5. 检查并设置审批顺序
    const existingOrder = await all(`SELECT COUNT(*) as count FROM approval_order`)
    if (existingOrder[0].count === 0) {
      const approvalOrder = [
        { role: 'gm', sort: 1 },
        { role: 'chairman', sort: 2 },
        { role: 'finance_manager', sort: 3 }
      ]
      
      for (const order of approvalOrder) {
        await run(`INSERT INTO approval_order (role, sort) VALUES (?, ?)`, [order.role, order.sort])
      }
      console.log('设置审批顺序')
    }
    
    console.log('数据添加完成！')
    
  } catch (error) {
    console.error('添加数据失败:', error)
  } finally {
    db.close()
  }
}

addMissingData()