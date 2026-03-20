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

async function createProjects() {
  try {
    console.log('开始创建三个完整项目...')
    const now = new Date().toISOString()
    
    // 清空现有项目数据
    await run(`DELETE FROM projects`)
    await run(`DELETE FROM materials`)
    await run(`DELETE FROM suppliers`)
    await run(`DELETE FROM supplier_contracts`)
    await run(`DELETE FROM contract_payments`)
    await run(`DELETE FROM supplier_evaluations`)
    
    // 项目1: 先进金属基复合材料研发及产业化项目
    const project1Id = generateId()
    await run(`INSERT INTO projects (
      id, code, name, client, contractNo, totalBudget, balance, duration, 
      clientFinancialInfo, projectOverview, settlementAmount, paymentMethod, 
      invoiceInfo, approvalStatus, createdBy, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      project1Id,
      'PROJ-2025-001',
      '先进金属基复合材料研发及产业化项目630kVA临时基建箱变工程',
      '某新材料科技有限公司',
      'HT-XJL-2025-001',
      8500000,
      8500000,
      '18个月',
      '开户行：中国工商银行，账号：6222021234567890123，开户名：某新材料科技有限公司',
      '本项目为先进金属基复合材料研发及产业化项目的配套基础设施建设，主要包括630kVA临时基建箱变工程的设计、采购、安装及调试。项目涉及高压配电设备、变压器、控制系统等核心设备的采购和安装，确保研发基地的稳定供电。',
      8200000,
      '分三期付款：合同签订后30%，设备到货验收后40%，项目完工验收后30%',
      '增值税专用发票，税率13%',
      'approved',
      'gm1',
      now,
      now
    ])
    
    // 项目2: 智能制造产线升级改造项目
    const project2Id = generateId()
    await run(`INSERT INTO projects (
      id, code, name, client, contractNo, totalBudget, balance, duration, 
      clientFinancialInfo, projectOverview, settlementAmount, paymentMethod, 
      invoiceInfo, approvalStatus, createdBy, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      project2Id,
      'PROJ-2025-002',
      '智能制造产线升级改造项目',
      '华东智能制造有限公司',
      'HT-ZN-2025-002',
      12000000,
      12000000,
      '24个月',
      '开户行：中国建设银行，账号：6217001234567890123，开户名：华东智能制造有限公司',
      '智能制造产线升级改造项目，包括自动化设备采购、控制系统集成、生产线布局优化等。项目将大幅提升生产效率和产品质量，实现数字化、智能化生产管理。',
      11500000,
      '分四期付款：合同签订后20%，设备采购完成后30%，安装调试完成后30%，验收合格后20%',
      '增值税专用发票，税率13%',
      'approved',
      'pm1',
      now,
      now
    ])
    
    // 项目3: 绿色能源储能系统建设项目
    const project3Id = generateId()
    await run(`INSERT INTO projects (
      id, code, name, client, contractNo, totalBudget, balance, duration, 
      clientFinancialInfo, projectOverview, settlementAmount, paymentMethod, 
      invoiceInfo, approvalStatus, createdBy, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      project3Id,
      'PROJ-2025-003',
      '绿色能源储能系统建设项目',
      '绿色新能源发展集团',
      'HT-LS-2025-003',
      15800000,
      15800000,
      '30个月',
      '开户行：中国农业银行，账号：6228481234567890123，开户名：绿色新能源发展集团',
      '绿色能源储能系统建设项目，包括大容量锂电池储能系统、智能能源管理系统、配套电力设施等。项目旨在提高可再生能源利用效率，实现电网削峰填谷，促进绿色低碳发展。',
      15200000,
      '分五期付款：合同签订后15%，设备采购后25%，土建完成后20%，设备安装后25%，验收后15%',
      '增值税专用发票，税率13%',
      'approved',
      'pm1',
      now,
      now
    ])
    
    console.log('✓ 创建了3个项目')
    
    // 创建供应商
    const suppliers = [
      {
        id: generateId(),
        name: '北京电力设备制造有限公司',
        contact: '张工程师',
        phone: '010-12345678',
        address: '北京市朝阳区电力设备产业园区88号',
        bankAccount: '工商银行北京分行 1234567890123456',
        taxNo: '91110000MA001234X',
        category: '电力设备制造',
        rating: 5,
        status: 'active'
      },
      {
        id: generateId(),
        name: '上海变压器股份有限公司',
        contact: '李总工',
        phone: '021-87654321',
        address: '上海市浦东新区张江高科技园区168号',
        bankAccount: '建设银行上海分行 9876543210987654',
        taxNo: '91310000MA002345Y',
        category: '变压器制造',
        rating: 5,
        status: 'active'
      },
      {
        id: generateId(),
        name: '深圳智能控制系统有限公司',
        contact: '王经理',
        phone: '0755-23456789',
        address: '深圳市南山区科技园南区科苑路15号',
        bankAccount: '平安银行深圳分行 5678901234567890',
        taxNo: '91440300MA003456Z',
        category: '智能控制系统',
        rating: 4,
        status: 'active'
      },
      {
        id: generateId(),
        name: '江苏储能技术有限公司',
        contact: '陈博士',
        phone: '025-34567890',
        address: '江苏省南京市江宁区科学园区创新路66号',
        bankAccount: '中国银行南京分行 7890123456789012',
        taxNo: '91320100MA004567A',
        category: '储能设备',
        rating: 5,
        status: 'active'
      }
    ]
    
    for (const supplier of suppliers) {
      await run(`INSERT INTO suppliers (
        id, name, contact, phone, address, bankAccount, 
        taxNo, category, rating, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        supplier.id, supplier.name, supplier.contact, supplier.phone,
        supplier.address, supplier.bankAccount, supplier.taxNo,
        supplier.category, supplier.rating, supplier.status, now, now
      ])
    }
    
    console.log('✓ 创建了4个供应商')
    
    // 为项目1创建材料清单（630kVA箱变工程）
    const project1Materials = [
      {
        projectId: project1Id,
        serialNumber: '001',
        name: '630kVA干式变压器',
        specification: 'SCB13-630/10/0.4kV',
        unit: '台',
        quantity: 1,
        unitPrice: 280000,
        totalPrice: 280000,
        remarks: '环保型干式变压器，符合国家标准',
        supplier: '上海变压器股份有限公司',
        type: '主要设备'
      },
      {
        projectId: project1Id,
        serialNumber: '002',
        name: '10kV高压开关柜',
        specification: 'KYN28A-12/1250A',
        unit: '面',
        quantity: 6,
        unitPrice: 45000,
        totalPrice: 270000,
        remarks: '户内金属铠装移开式开关设备',
        supplier: '北京电力设备制造有限公司',
        type: '主要设备'
      },
      {
        projectId: project1Id,
        serialNumber: '003',
        name: '0.4kV低压配电柜',
        specification: 'GCS型抽出式开关柜',
        unit: '面',
        quantity: 8,
        unitPrice: 25000,
        totalPrice: 200000,
        remarks: '低压配电及控制设备',
        supplier: '北京电力设备制造有限公司',
        type: '主要设备'
      },
      {
        projectId: project1Id,
        serialNumber: '004',
        name: '箱变外壳',
        specification: '不锈钢材质，防护等级IP33',
        unit: '套',
        quantity: 1,
        unitPrice: 120000,
        totalPrice: 120000,
        remarks: '包含基础、外壳、通风系统',
        supplier: '北京电力设备制造有限公司',
        type: '辅助设备'
      },
      {
        projectId: project1Id,
        serialNumber: '005',
        name: '电缆及附件',
        specification: 'YJV22-8.7/15kV-3×95',
        unit: '米',
        quantity: 500,
        unitPrice: 180,
        totalPrice: 90000,
        remarks: '高压电缆及终端头',
        supplier: '北京电力设备制造有限公司',
        type: '辅助材料'
      }
    ]
    
    // 为项目2创建材料清单（智能制造产线）
    const project2Materials = [
      {
        projectId: project2Id,
        serialNumber: '001',
        name: '工业机器人',
        specification: '六轴关节机器人，负载20kg',
        unit: '台',
        quantity: 12,
        unitPrice: 180000,
        totalPrice: 2160000,
        remarks: '用于自动化装配和搬运',
        supplier: '深圳智能控制系统有限公司',
        type: '主要设备'
      },
      {
        projectId: project2Id,
        serialNumber: '002',
        name: '智能控制系统',
        specification: 'PLC+HMI+SCADA系统',
        unit: '套',
        quantity: 1,
        unitPrice: 850000,
        totalPrice: 850000,
        remarks: '生产线集中控制系统',
        supplier: '深圳智能控制系统有限公司',
        type: '主要设备'
      },
      {
        projectId: project2Id,
        serialNumber: '003',
        name: '自动化输送线',
        specification: '链式输送机，长度100米',
        unit: '套',
        quantity: 2,
        unitPrice: 320000,
        totalPrice: 640000,
        remarks: '产品自动输送系统',
        supplier: '深圳智能控制系统有限公司',
        type: '主要设备'
      }
    ]
    
    // 为项目3创建材料清单（储能系统）
    const project3Materials = [
      {
        projectId: project3Id,
        serialNumber: '001',
        name: '锂电池储能系统',
        specification: '磷酸铁锂电池，容量10MWh',
        unit: '套',
        quantity: 1,
        unitPrice: 8500000,
        totalPrice: 8500000,
        remarks: '大容量储能电池系统',
        supplier: '江苏储能技术有限公司',
        type: '主要设备'
      },
      {
        projectId: project3Id,
        serialNumber: '002',
        name: '储能变流器',
        specification: 'PCS系统，功率2.5MW',
        unit: '台',
        quantity: 4,
        unitPrice: 450000,
        totalPrice: 1800000,
        remarks: '双向变流器系统',
        supplier: '江苏储能技术有限公司',
        type: '主要设备'
      },
      {
        projectId: project3Id,
        serialNumber: '003',
        name: '能源管理系统',
        specification: 'EMS智能管理平台',
        unit: '套',
        quantity: 1,
        unitPrice: 680000,
        totalPrice: 680000,
        remarks: '储能系统智能管理平台',
        supplier: '深圳智能控制系统有限公司',
        type: '主要设备'
      }
    ]
    
    // 插入所有材料
    const allMaterials = [...project1Materials, ...project2Materials, ...project3Materials]
    for (const material of allMaterials) {
      const materialId = generateId()
      await run(`INSERT INTO materials (
        id, projectId, serialNumber, name, specification, unit, quantity, 
        unitPrice, totalPrice, remarks, supplier, type, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        materialId, material.projectId, material.serialNumber, material.name,
        material.specification, material.unit, material.quantity, material.unitPrice,
        material.totalPrice, material.remarks, material.supplier, material.type,
        now, now
      ])
    }
    
    console.log('✓ 创建了材料清单')
    
    // 创建供应商合同
    const contracts = [
      {
        projectId: project1Id,
        contractNo: 'HT-XJL-GY-001',
        contractName: '630kVA箱变设备采购合同',
        supplierId: suppliers[1].id,
        supplierName: '上海变压器股份有限公司',
        contractAmount: 550000,
        paymentMethod: '分期付款',
        materialList: project1Materials.slice(0, 2)
      },
      {
        projectId: project2Id,
        contractNo: 'HT-ZN-GY-001',
        contractName: '智能制造设备采购合同',
        supplierId: suppliers[2].id,
        supplierName: '深圳智能控制系统有限公司',
        contractAmount: 3650000,
        paymentMethod: '分期付款',
        materialList: project2Materials
      },
      {
        projectId: project3Id,
        contractNo: 'HT-LS-GY-001',
        contractName: '储能系统设备采购合同',
        supplierId: suppliers[3].id,
        supplierName: '江苏储能技术有限公司',
        contractAmount: 10300000,
        paymentMethod: '分期付款',
        materialList: project3Materials.slice(0, 2)
      }
    ]
    
    for (const contract of contracts) {
      const contractId = generateId()
      await run(`INSERT INTO supplier_contracts (
        id, contractNo, contractName, projectId, supplierId, supplierName, 
        contractAmount, paymentMethod, materialList, status, approvalStatus, 
        isArchived, createdBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        contractId,
        contract.contractNo,
        contract.contractName,
        contract.projectId,
        contract.supplierId,
        contract.supplierName,
        contract.contractAmount,
        contract.paymentMethod,
        JSON.stringify(contract.materialList),
        'active',
        'approved',
        0,
        'proc1',
        now,
        now
      ])
    }
    
    console.log('✓ 创建了供应商合同')
    
    console.log('\n项目创建完成！')
    console.log('已创建的项目:')
    console.log('1. 先进金属基复合材料研发及产业化项目630kVA临时基建箱变工程 - 850万')
    console.log('2. 智能制造产线升级改造项目 - 1200万')
    console.log('3. 绿色能源储能系统建设项目 - 1580万')
    console.log('\n包含完整的:')
    console.log('- 项目基本信息和财务信息')
    console.log('- 详细材料清单')
    console.log('- 供应商信息')
    console.log('- 采购合同')
    
  } catch (error) {
    console.error('创建项目失败:', error)
  } finally {
    db.close()
  }
}

createProjects()