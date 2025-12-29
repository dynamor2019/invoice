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

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
}

async function addBillsAndPayments() {
  try {
    console.log('添加报销单和付款记录...')
    const now = new Date().toISOString()
    
    // 获取项目ID
    const projects = await all(`SELECT id, name FROM projects`)
    if (projects.length === 0) {
      console.log('没有找到项目，请先创建项目')
      return
    }
    
    // 获取合同ID
    const contracts = await all(`SELECT id, contractName, supplierName, contractAmount FROM supplier_contracts`)
    
    // 清空现有数据
    await run(`DELETE FROM bills`)
    await run(`DELETE FROM contract_payments`)
    
    // 创建报销单
    const bills = [
      {
        projectId: projects[0].id,
        title: '项目前期调研差旅费',
        amount: 8500,
        category: '差旅费',
        date: '2025-12-20',
        createdBy: 'user01'
      },
      {
        projectId: projects[0].id,
        title: '设备采购运输费',
        amount: 15000,
        category: '运输费',
        date: '2025-12-22',
        createdBy: 'user02'
      },
      {
        projectId: projects[1].id,
        title: '技术培训费用',
        amount: 25000,
        category: '培训费',
        date: '2025-12-23',
        createdBy: 'user03'
      },
      {
        projectId: projects[1].id,
        title: '设备安装调试费',
        amount: 35000,
        category: '服务费',
        date: '2025-12-24',
        createdBy: 'user04'
      },
      {
        projectId: projects[2].id,
        title: '环评咨询费',
        amount: 18000,
        category: '咨询费',
        date: '2025-12-25',
        createdBy: 'user05'
      },
      {
        projectId: projects[2].id,
        title: '土建工程款',
        amount: 120000,
        category: '工程费',
        date: '2025-12-26',
        createdBy: 'pm1'
      }
    ]
    
    // 获取审批顺序
    const approvalOrder = await all(`SELECT role FROM approval_order ORDER BY sort ASC`)
    const steps = approvalOrder.map(r => r.role).concat(['accountant'])
    
    for (const bill of bills) {
      const billId = generateId()
      const history = [{ action: 'create', by: bill.createdBy, time: now }]
      
      await run(`INSERT INTO bills (
        id, title, amount, category, date, projectId, createdBy, status, 
        steps, currentStepIndex, history, images
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        billId, bill.title, bill.amount, bill.category, bill.date, 
        bill.projectId, bill.createdBy, 'pending', JSON.stringify(steps), 
        0, JSON.stringify(history), JSON.stringify([])
      ])
    }
    
    console.log('✓ 创建了6个报销单')
    
    // 创建合同付款记录
    if (contracts.length > 0) {
      const payments = [
        {
          contractId: contracts[0].id,
          contractNo: 'HT-XJL-GY-001',
          contractName: contracts[0].contractName,
          supplierName: contracts[0].supplierName,
          paymentAmount: 165000, // 30%首付
          paymentDate: '2025-12-15',
          paymentMethod: '银行转账',
          invoiceNo: 'FP-2025-001',
          remarks: '合同首付款30%'
        },
        {
          contractId: contracts[1].id,
          contractNo: 'HT-ZN-GY-001',
          contractName: contracts[1].contractName,
          supplierName: contracts[1].supplierName,
          paymentAmount: 730000, // 20%首付
          paymentDate: '2025-12-18',
          paymentMethod: '银行转账',
          invoiceNo: 'FP-2025-002',
          remarks: '合同首付款20%'
        },
        {
          contractId: contracts[2].id,
          contractNo: 'HT-LS-GY-001',
          contractName: contracts[2].contractName,
          supplierName: contracts[2].supplierName,
          paymentAmount: 1545000, // 15%首付
          paymentDate: '2025-12-20',
          paymentMethod: '银行转账',
          invoiceNo: 'FP-2025-003',
          remarks: '合同首付款15%'
        }
      ]
      
      for (const payment of payments) {
        const paymentId = generateId()
        await run(`INSERT INTO contract_payments (
          id, contractId, contractNo, contractName, supplierName, 
          paymentAmount, paymentDate, paymentMethod, invoiceNo, 
          remarks, createdBy, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          paymentId, payment.contractId, payment.contractNo, 
          payment.contractName, payment.supplierName, payment.paymentAmount,
          payment.paymentDate, payment.paymentMethod, payment.invoiceNo,
          payment.remarks, 'finance1', now, now
        ])
      }
      
      console.log('✓ 创建了3个合同付款记录')
    }
    
    // 创建供应商评价
    const evaluations = [
      {
        supplierName: '上海变压器股份有限公司',
        projectId: projects[0].id,
        contractId: contracts[0]?.id,
        rating: 5,
        qualityScore: 5,
        deliveryScore: 4,
        serviceScore: 5,
        comments: '产品质量优秀，技术支持到位，交货及时'
      },
      {
        supplierName: '深圳智能控制系统有限公司',
        projectId: projects[1].id,
        contractId: contracts[1]?.id,
        rating: 4,
        qualityScore: 4,
        deliveryScore: 4,
        serviceScore: 4,
        comments: '系统集成能力强，但交货时间略有延迟'
      }
    ]
    
    for (const evaluation of evaluations) {
      const evalId = generateId()
      await run(`INSERT INTO supplier_evaluations (
        id, supplierName, projectId, contractId, rating, qualityScore, 
        deliveryScore, serviceScore, comments, evaluatedBy, evaluatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        evalId, evaluation.supplierName, evaluation.projectId, 
        evaluation.contractId, evaluation.rating, evaluation.qualityScore,
        evaluation.deliveryScore, evaluation.serviceScore, evaluation.comments,
        'pm1', now
      ])
    }
    
    console.log('✓ 创建了2个供应商评价')
    
    // 创建通知
    const notifications = [
      {
        userId: 'approver3', // 董事长
        title: '新项目立项通知',
        content: '先进金属基复合材料项目已成功立项，请关注项目进展',
        type: 'project'
      },
      {
        userId: 'approver2', // 副董事长
        title: '合同审批通知',
        content: '智能制造设备采购合同已通过审批',
        type: 'approval'
      },
      {
        userId: 'finance1', // 财务主管
        title: '付款完成通知',
        content: '储能系统首付款154.5万元已完成支付',
        type: 'payment'
      }
    ]
    
    for (const notification of notifications) {
      const notifId = generateId()
      await run(`INSERT INTO notifications (
        id, userId, title, content, type, isRead, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        notifId, notification.userId, notification.title, 
        notification.content, notification.type, 0, now
      ])
    }
    
    console.log('✓ 创建了3个通知')
    
    console.log('\n数据完善完成！')
    console.log('系统现在包含:')
    console.log('- 3个完整项目（包含详细信息和材料清单）')
    console.log('- 4个供应商（包含联系方式和评级）')
    console.log('- 3个采购合同（已审批通过）')
    console.log('- 6个报销单（关联到具体项目）')
    console.log('- 3个合同付款记录')
    console.log('- 2个供应商评价')
    console.log('- 3个系统通知')
    
  } catch (error) {
    console.error('添加数据失败:', error)
  } finally {
    db.close()
  }
}

addBillsAndPayments()