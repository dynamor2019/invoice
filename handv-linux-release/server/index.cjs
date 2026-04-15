// [CodeGuard Protection]
// Feature: 修复表格注入跨段匹配误删内容
// Version: 24
// P26-04-14 14:21:34
// Policy: Do not modify directly. Explain reason before edits. Last confirm reason: 用户确认导出500修复、表格渲染修复和正文保留修复

// Policy: Do not modify directly. Explain reason before edits. Last confirm reason: supplier contract template upload endpoint returned 404; added GET/POST /api/supplier-contract-template and verified 200

const express = require('express')
const cors = require('cors')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()
const fs = require('fs')
const multer = require('multer')
const os = require('os')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const PizZip = require('pizzip')
const Docxtemplater = require('docxtemplater')

const app = express()
// 开发便捷：默认启用 ALLOW_DEV_RESET，允许批量重置非管理员密码（仅本地环境使用）
process.env.ALLOW_DEV_RESET = process.env.ALLOW_DEV_RESET || '1'
// CORS: 允许来自配置源的请求（默认开发放开，生产可通过环境变量限制）
const allowOrigins = (process.env.ALLOW_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true) // 同源或非浏览器请求
    if (allowOrigins.length === 0 || allowOrigins.includes(origin)) return cb(null, true)
    return cb(new Error('CORS not allowed'), false)
  },
  credentials: true,
}))
// 限制 JSON 体大小
app.use(express.json({ limit: '1mb' }))
// 也支持表单编码，便于命令行或旧客户端调试
app.use(express.urlencoded({ extended: false }))
// 在反向代理（Nginx/Traefik）后部署时，信任代理以便正确解析协议与主机头
app.set('trust proxy', true)

const DB_PATH = path.join(__dirname, 'data', 'app.db')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
const db = new sqlite3.Database(DB_PATH)

// Uploads directory and static serving
const UPLOAD_DIR = path.join(__dirname, 'data', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })
app.use('/uploads', express.static(UPLOAD_DIR))

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

function loadLegacyTemplateMarkerMap() {
  const files = [
    path.join(__dirname, '..', 'template_placeholder_mapping_v2.json'),
    path.join(__dirname, '..', 'template_placeholder_mapping.json'),
    path.join(__dirname, '..', 'tmp_template_mapping_result.json'),
  ]
  const markerMap = new Map()
  for (const f of files) {
    try {
      if (!fs.existsSync(f)) continue
      const raw = fs.readFileSync(f, 'utf8')
      const parsed = JSON.parse(raw)
      const arr = Array.isArray(parsed?.replaced) ? parsed.replaced : []
      for (const item of arr) {
        const from = String(item?.from || '')
        const to = String(item?.to || '')
        const m = to.match(/^\{\{\s*([a-zA-Z0-9_]+)\s*\}\}$/)
        if (!m) continue
        if (!from) continue
        if (from.includes('{{') || from.includes('}}')) continue
        markerMap.set(from, m[1])
      }
    } catch {
      // ignore bad mapping file
    }
  }
  return markerMap
}

const LEGACY_TEMPLATE_MARKERS = loadLegacyTemplateMarkerMap()

function parseJsonArraySafe(v) {
  let x = v
  for (let i = 0; i < 2; i++) {
    if (Array.isArray(x)) return x
    if (typeof x === 'string') {
      try { x = JSON.parse(x) } catch { break }
    } else {
      break
    }
  }
  return Array.isArray(x) ? x : []
}

function normalizeBillRow(r) {
  const out = { ...r }
  out.amount = Number(out.amount) || 0
  out.currentStepIndex = Number(out.currentStepIndex) || 0
  out.steps = parseJsonArraySafe(out.steps)
  out.history = parseJsonArraySafe(out.history)
  out.images = parseJsonArraySafe(out.images)
  out.relatedId = out.relatedId || null
  // 确保前端能获取到提交人信息
  out.submitterId = out.createdBy
  return out
}

async function ensureSchema() {
  await run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, role TEXT, password TEXT)`)
  await run(`CREATE TABLE IF NOT EXISTS approval_order (role TEXT PRIMARY KEY, sort INTEGER)`)
  await run(`CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    title TEXT,
    amount REAL,
    category TEXT,
    date TEXT,
    projectId TEXT,
    createdBy TEXT,
    status TEXT,
    steps TEXT,
    currentStepIndex INTEGER,
    history TEXT,
    images TEXT
  )`)
  
  // 为现有bills表添加projectId字段（如果不存在）
  try {
    await run(`ALTER TABLE bills ADD COLUMN projectId TEXT`)
  } catch (e) {
    // 字段已存在，忽略错误
  }
  await run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`)
  
  // 项目管理表
  await run(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    client TEXT,
    contractNo TEXT,
    totalBudget REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    duration TEXT,
    clientFinancialInfo TEXT,
    projectOverview TEXT,
    settlementAmount REAL DEFAULT 0,
    paymentMethod TEXT,
    invoiceInfo TEXT,
    contractFileUrl TEXT,
    approvalStatus TEXT DEFAULT 'draft',
    createdBy TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )`)
  
  // 供应商表
  await run(`CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    phone TEXT,
    address TEXT,
    bankAccount TEXT,
    taxNo TEXT,
    category TEXT,
    rating INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    createdAt TEXT,
    updatedAt TEXT
  )`)
  
  // 供应商合同表
  await run(`CREATE TABLE IF NOT EXISTS supplier_contracts (
    id TEXT PRIMARY KEY,
    contractNo TEXT UNIQUE,
    contractName TEXT,
    projectId TEXT,
    supplierId TEXT,
    supplierName TEXT,
    contractAmount REAL DEFAULT 0,
    paymentMethod TEXT,
    materialList TEXT,
    contractFileUrl TEXT,
    status TEXT DEFAULT 'draft',
    approvalStatus TEXT DEFAULT 'pending',
    isArchived INTEGER DEFAULT 0,
    createdBy TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY(projectId) REFERENCES projects(id),
    FOREIGN KEY(supplierId) REFERENCES suppliers(id)
  )`)
  // Backfill supplier_contracts columns for legacy databases.
  const supplierContractColumns = [
    ['supplierAddress', 'TEXT'],
    ['contactPerson', 'TEXT'],
    ['contactPhone', 'TEXT'],
    ['deliveryLocation', 'TEXT'],
    ['buyerName', 'TEXT'],
    ['buyerAddress', 'TEXT'],
    ['buyerBankName', 'TEXT'],
    ['buyerBankAccount', 'TEXT'],
    ['supplierBankName', 'TEXT'],
    ['supplierBankAccount', 'TEXT'],
    ['buyerAgent', 'TEXT'],
    ['supplierAgent', 'TEXT'],
    ['amountExclTax', 'REAL DEFAULT 0'],
    ['taxAmount', 'REAL DEFAULT 0'],
    ['contractAmountUpper', 'TEXT'],
    ['dateText', 'TEXT'],
    ['signDate', 'TEXT'],
    ['startDate', 'TEXT'],
    ['endDate', 'TEXT'],
    ['warrantyPeriod', 'TEXT'],
    ['qualityStandard', 'TEXT'],
    ['receiver', 'TEXT'],
  ]
  for (const [column, typeDef] of supplierContractColumns) {
    try {
      await run(`ALTER TABLE supplier_contracts ADD COLUMN ${column} ${typeDef}`)
    } catch {
      // column already exists
    }
  }
  
  // 材料清单表
  await run(`CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    serialNumber TEXT,
    name TEXT NOT NULL,
    specification TEXT,
    unit TEXT,
    quantity REAL DEFAULT 0,
    unitPrice REAL DEFAULT 0,
    totalPrice REAL DEFAULT 0,
    remarks TEXT,
    supplier TEXT,
    type TEXT DEFAULT '材料清单',
    contractId TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY(projectId) REFERENCES projects(id)
  )`)
  
  // 项目变更记录表
  await run(`CREATE TABLE IF NOT EXISTS project_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId TEXT,
    changeType TEXT,
    changeData TEXT,
    changedBy TEXT,
    changedAt TEXT,
    FOREIGN KEY(projectId) REFERENCES projects(id)
  )`)
  
  // 通知表
  await run(`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    userId TEXT,
    title TEXT,
    content TEXT,
    type TEXT,
    relatedId TEXT,
    isRead INTEGER DEFAULT 0,
    createdAt TEXT
  )`)

  // Ensure images column exists for legacy DBs
  try {
    const cols = await all(`PRAGMA table_info(bills)`) // name, type
    const hasImages = cols.some(c => c.name === 'images')
    if (!hasImages) {
      await run(`ALTER TABLE bills ADD COLUMN images TEXT`)
    }
  } catch (e) {
    // ignore
  }
  // 新增：重提关联字段 relatedId（双向关联旧/新）
  try {
    const cols2 = await all(`PRAGMA table_info(bills)`) // name, type
    const hasRelated = cols2.some(c => c.name === 'relatedId')
    if (!hasRelated) {
      await run(`ALTER TABLE bills ADD COLUMN relatedId TEXT`)
    }
  } catch (e) {
    // ignore
  }
  // 新增：修改历史记录表
  await run(`CREATE TABLE IF NOT EXISTS bill_edits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    originalId TEXT,
    newId TEXT,
    editorId TEXT,
    time TEXT,
    diff TEXT
  )`)

  // 新增：票据事由分级（一级分类 + 二级项目）
  await run(`CREATE TABLE IF NOT EXISTS reason_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort INTEGER DEFAULT 0,
    status TEXT DEFAULT 'enabled'
  )`)
  await run(`CREATE TABLE IF NOT EXISTS reason_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoryId INTEGER NOT NULL,
    name TEXT NOT NULL,
    sort INTEGER DEFAULT 0,
    status TEXT DEFAULT 'enabled',
    FOREIGN KEY(categoryId) REFERENCES reason_categories(id)
  )`)
}

async function seedIfEmpty() {
  const usersCount = (await all(`SELECT COUNT(*) as c FROM users`))[0].c
  if (usersCount === 0) {
    const defaults = [
      { id: 'admin', name: '管理员', role: 'admin', password: 'admin123' },
      { id: 'approver1', name: '一级审核', role: 'approver1', password: '123456' },
      { id: 'approver2', name: '二级审核', role: 'approver2', password: '123456' },
      { id: 'approver3', name: '三级审核', role: 'approver3', password: '123456' },
      // 工作人员（可由管理员修改姓名）
      { id: 'user01', name: '用户1', role: 'staff', password: '123456' },
      { id: 'user02', name: '用户2', role: 'staff', password: '123456' },
      { id: 'user03', name: '用户3', role: 'staff', password: '123456' },
      { id: 'user04', name: '用户4', role: 'staff', password: '123456' },
      { id: 'user05', name: '用户5', role: 'staff', password: '123456' },
      { id: 'user06', name: '用户6', role: 'staff', password: '123456' },
      { id: 'user07', name: '用户7', role: 'staff', password: '123456' },
      { id: 'user08', name: '用户8', role: 'staff', password: '123456' },
      { id: 'user09', name: '用户9', role: 'staff', password: '123456' },
      { id: 'user10', name: '用户10', role: 'staff', password: '123456' },
      { id: 'user11', name: '用户11', role: 'staff', password: '123456' },
      { id: 'user12', name: '用户12', role: 'staff', password: '123456' },
      { id: 'user13', name: '用户13', role: 'staff', password: '123456' },
      { id: 'user14', name: '用户14', role: 'staff', password: '123456' },
      { id: 'user15', name: '用户15', role: 'staff', password: '123456' },
      { id: 'accountant', name: '会计', role: 'accountant', password: '123456' },
    ]
    for (const u of defaults) {
      await run(`INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)`, [u.id, u.name, u.role, u.password])
    }
  }
  const orderCount = (await all(`SELECT COUNT(*) as c FROM approval_order`))[0].c
  if (orderCount === 0) {
    const order = ['approver1', 'approver2', 'approver3']
    for (let i = 0; i < order.length; i++) {
      await run(`INSERT INTO approval_order (role, sort) VALUES (?, ?)`, [order[i], i])
    }
  }

  // 事由分级：默认预置“其他”/“未分类”
  const rcCount = (await all(`SELECT COUNT(*) as c FROM reason_categories`))[0]?.c || 0
  if (rcCount === 0) {
    const r = await run(`INSERT INTO reason_categories (name, sort, status) VALUES (?, ?, 'enabled')`, ['其他', 999])
    const catId = r.lastID
    await run(`INSERT INTO reason_items (categoryId, name, sort, status) VALUES (?, ?, ?, 'enabled')`, [catId, '未分类', 999])
  }
}

// Routes
app.get('/api/ping', (req, res) => res.json({ ok: true }))

// 返回当前请求可识别的访问基址，便于前端/运维自动适配 IP/域名与协议
app.get('/api/base', (req, res) => {
  // 优先使用代理头部，其次使用 Express 解析的协议与 Host
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0]
  const host = String(req.headers['x-forwarded-host'] || req.headers['host'] || '').split(',')[0]
  const origin = host ? `${proto}://${host}` : ''
  res.json({
    origin,
    apiBase: origin ? `${origin}/api` : '',
    uploadsBase: origin ? `${origin}/uploads` : '',
  })
})

// 新增：登录与密码管理接口
app.post('/api/login', async (req, res) => {
  const { id, password } = req.body || {}
  if (!id || !password) return res.status(400).json({ error: '缺少参数' })
  try {
    const rows = await all(`SELECT id, name, role, password FROM users WHERE id = ? LIMIT 1`, [id])
    const u = rows[0]
    if (!u || String(u.password) !== String(password)) {
      return res.status(401).json({ error: '账号或密码错误' })
    }
    const token = jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' })
    res.json({ id: u.id, name: u.name, role: u.role, token })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/user/change-password', auth, async (req, res) => {
  const { id, oldPassword, newPassword } = req.body || {}
  if (!id || !newPassword) return res.status(400).json({ error: '缺少参数' })
  try {
    // 允许本人修改；管理员也可修改任意用户密码
    if (req.user?.id !== id && req.user?.role !== 'admin') {
      return res.status(403).json({ error: '无权限' })
    }
    const rows = await all(`SELECT id, password FROM users WHERE id = ? LIMIT 1`, [id])
    const u = rows[0]
    if (!u) return res.status(404).json({ error: '用户不存在' })
    if (req.user?.role !== 'admin') {
      if (String(u.password) !== String(oldPassword || '')) {
        return res.status(400).json({ error: '原密码不正确' })
      }
    }
    await run(`UPDATE users SET password = ? WHERE id = ?`, [String(newPassword), id])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/user/reset-password', auth, async (req, res) => {
  const { id } = req.body || {}
  if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' })
  if (!id) return res.status(400).json({ error: '缺少参数' })
  try {
    const rows = await all(`SELECT id FROM users WHERE id = ? LIMIT 1`, [id])
    const u = rows[0]
    if (!u) return res.status(404).json({ error: '用户不存在' })
    await run(`UPDATE users SET password = ? WHERE id = ?`, ['123456', id])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DEV ONLY: bulk reset non-admin passwords to '123456' when ALLOW_DEV_RESET=1
app.post('/api/dev/reset-passwords', async (req, res) => {
  if (String(process.env.ALLOW_DEV_RESET || '') !== '1') {
    return res.status(403).json({ error: '未启用开发重置' })
  }
  try {
    const r = await run(`UPDATE users SET password = '123456' WHERE role <> 'admin'`)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/dev/user/:id', async (req, res) => {
  if (String(process.env.ALLOW_DEV_RESET || '') !== '1') {
    return res.status(403).json({ error: '未启用开发接口' })
  }
  try {
    const rows = await all(`SELECT id, name, role, password FROM users WHERE id = ? LIMIT 1`, [String(req.params.id)])
    const u = rows[0]
    if (!u) return res.status(404).json({ error: '用户不存在' })
    res.json(u)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/dev/users', async (req, res) => {
  if (String(process.env.ALLOW_DEV_RESET || '') !== '1') {
    return res.status(403).json({ error: '未启用开发接口' })
  }
  try {
    const rows = await all(`SELECT id, name, role, password FROM users ORDER BY id ASC`)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DEV ONLY: reset users and approval order to new defaults (3 approvers + 15 staff + accountant)
app.post('/api/dev/reset-defaults', async (req, res) => {
  if (String(process.env.ALLOW_DEV_RESET || '') !== '1') {
    return res.status(403).json({ error: '未启用开发接口' })
  }
  try {
    const defaults = [
      { id: 'admin', name: '管理员', role: 'admin', password: 'admin123' },
      { id: 'approver1', name: '一级审核', role: 'approver1', password: '123456' },
      { id: 'approver2', name: '二级审核', role: 'approver2', password: '123456' },
      { id: 'approver3', name: '三级审核', role: 'approver3', password: '123456' },
      { id: 'user01', name: '用户1', role: 'staff', password: '123456' },
      { id: 'user02', name: '用户2', role: 'staff', password: '123456' },
      { id: 'user03', name: '用户3', role: 'staff', password: '123456' },
      { id: 'user04', name: '用户4', role: 'staff', password: '123456' },
      { id: 'user05', name: '用户5', role: 'staff', password: '123456' },
      { id: 'user06', name: '用户6', role: 'staff', password: '123456' },
      { id: 'user07', name: '用户7', role: 'staff', password: '123456' },
      { id: 'user08', name: '用户8', role: 'staff', password: '123456' },
      { id: 'user09', name: '用户9', role: 'staff', password: '123456' },
      { id: 'user10', name: '用户10', role: 'staff', password: '123456' },
      { id: 'user11', name: '用户11', role: 'staff', password: '123456' },
      { id: 'user12', name: '用户12', role: 'staff', password: '123456' },
      { id: 'user13', name: '用户13', role: 'staff', password: '123456' },
      { id: 'user14', name: '用户14', role: 'staff', password: '123456' },
      { id: 'user15', name: '用户15', role: 'staff', password: '123456' },
      { id: 'accountant', name: '会计', role: 'accountant', password: '123456' },
    ]
    await run(`DELETE FROM users`)
    for (const u of defaults) {
      await run(`INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)`, [u.id, u.name, u.role, u.password])
    }
    const order = ['approver1', 'approver2', 'approver3']
    await run(`DELETE FROM approval_order`)
    for (let i = 0; i < order.length; i++) {
      await run(`INSERT INTO approval_order (role, sort) VALUES (?, ?)`, [order[i], i])
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
app.get('/api/me', auth, (req, res) => {
  res.json({ id: req.user?.id || null, role: req.user?.role || null })
})

// 工具：将审批角色格式化为“姓名(工号)”
async function formatAccountLabelForRole(role) {
  try {
    const rows = await all(`SELECT id, name FROM users WHERE role = ? LIMIT 1`, [String(role)])
    const u = rows[0]
    if (u && u.id && u.name) return `${u.name}(${u.id})`
    return String(role || '')
  } catch {
    return String(role || '')
  }
}

// Pending bills for a specific role (server-side filtered)
app.get('/api/todos/:role', async (req, res) => {
  try {
    const role = String(req.params.role || '').trim()
    const rows = await all(`SELECT id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history, images FROM bills WHERE status = 'pending' ORDER BY date DESC, id DESC`)
    const parsed = rows.map(r => normalizeBillRow(r)).filter(b => Array.isArray(b.steps) && b.steps[b.currentStepIndex] === role)
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const rows = await all(`SELECT id, name, role FROM users`)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 添加用户
app.post('/api/users', auth, async (req, res) => {
  try {
    const { id, name, role, password } = req.body
    if (!id || !name || !role || !password) {
      return res.status(400).json({ error: '缺少必要参数' })
    }
    
    // 检查用户是否已存在
    const existing = await all(`SELECT id FROM users WHERE id = ?`, [id])
    if (existing.length > 0) {
      return res.status(400).json({ error: '用户ID已存在' })
    }
    
    await run(`INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)`, [id, name, role, password])
    res.json({ success: true, message: '用户添加成功' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 更新用户
app.put('/api/users/:id', auth, async (req, res) => {
  try {
    const { name, role, password } = req.body
    const userId = req.params.id
    
    let sql = 'UPDATE users SET '
    let params = []
    let updates = []
    
    if (name) {
      updates.push('name = ?')
      params.push(name)
    }
    if (role) {
      updates.push('role = ?')
      params.push(role)
    }
    if (password) {
      updates.push('password = ?')
      params.push(password)
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' })
    }
    
    sql += updates.join(', ') + ' WHERE id = ?'
    params.push(userId)
    
    await run(sql, params)
    res.json({ success: true, message: '用户更新成功' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 公司名称设置：获取
app.get('/api/setting/companyName', async (req, res) => {
  try {
    const rows = await all(`SELECT value FROM settings WHERE key = 'companyName' LIMIT 1`)
    const v = rows[0]?.value || ''
    res.json({ companyName: v })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 公司名称设置：更新（仅管理员）
app.put('/api/setting/companyName', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' })
    const name = String((req.body?.companyName ?? '')).slice(0, 100)
    await run(`REPLACE INTO settings (key, value) VALUES ('companyName', ?)`, [name])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 审批免审阈值：读取
app.get('/api/setting/approvalThresholds', async (req, res) => {
  try {
    const rows = await all(`SELECT value FROM settings WHERE key = 'approvalThresholds' LIMIT 1`)
    let v = {}
    try { v = JSON.parse(rows[0]?.value || '{}') } catch { v = {} }
    const out = {
      approver1: Number(v.approver1) || 0,
      approver2: Number(v.approver2) || 0,
      approver3: Number(v.approver3) || 0,
    }
    res.json(out)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 审批免审阈值：更新（仅管理员）
app.put('/api/setting/approvalThresholds', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' })
    const body = req.body || {}
    const payload = {
      approver1: Number(body.approver1 ?? body?.thresholds?.approver1 ?? 0) || 0,
      approver2: Number(body.approver2 ?? body?.thresholds?.approver2 ?? 0) || 0,
      approver3: Number(body.approver3 ?? body?.thresholds?.approver3 ?? 0) || 0,
    }
    await run(`REPLACE INTO settings (key, value) VALUES ('approvalThresholds', ?)`, [JSON.stringify(payload)])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 事由层级：读取（以 JSON 形式存储在 settings 表）
app.get('/api/setting/reasonHierarchy', async (req, res) => {
  try {
    const rows = await all(`SELECT value FROM settings WHERE key = 'reasonHierarchy' LIMIT 1`)
    let v = []
    try { v = JSON.parse(rows[0]?.value || '[]') } catch { v = [] }
    // 兼容返回结构：数组或对象包装
    const out = Array.isArray(v) ? v : (Array.isArray(v?.hierarchy) ? v.hierarchy : [])
    res.json({ hierarchy: out })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 事由层级：更新（仅管理员）
app.put('/api/setting/reasonHierarchy', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' })
    const hierarchy = Array.isArray(req.body?.hierarchy) ? req.body.hierarchy : []
    // 仅存储必要字段，避免过大数据
    const normalized = hierarchy.map(n => ({
      text: String(n.text || ''),
      level: Number(n.level) || 0,
    }))
    await run(`REPLACE INTO settings (key, value) VALUES ('reasonHierarchy', ?)`, [JSON.stringify(normalized)])
    // 同步到票据事由（一级分类 + 二级项目）
    // 策略：level=0 为一级分类；level>=1 视为二级项目，归属最近的一级分类；
    // 若开头出现二级项目，将先创建一个默认分类“其他”。若某分类没有任何项目，则补充一个“未分类”。
    await run(`DELETE FROM reason_items`)
    await run(`DELETE FROM reason_categories`)
    let catSort = 0
    let lastCatId = null
    let itemSort = 0
    const categories = [] // { id, hasItem }
    for (const n of normalized) {
      const text = (String(n.text || '').trim() || '未命名')
      const lvl = Number(n.level) || 0
      if (lvl <= 0) {
        const r = await run(`INSERT INTO reason_categories (name, sort, status) VALUES (?, ?, 'enabled')`, [text, catSort++])
        lastCatId = r.lastID
        itemSort = 0
        categories.push({ id: lastCatId, hasItem: false })
      } else {
        if (!lastCatId) {
          const rcat = await run(`INSERT INTO reason_categories (name, sort, status) VALUES (?, ?, 'enabled')`, ['其他', catSort++])
          lastCatId = rcat.lastID
          itemSort = 0
          categories.push({ id: lastCatId, hasItem: false })
        }
        await run(`INSERT INTO reason_items (categoryId, name, sort, status) VALUES (?, ?, ?, 'enabled')`, [lastCatId, text, itemSort++])
        const cur = categories[categories.length - 1]
        if (cur) cur.hasItem = true
      }
    }
    // 为没有项目的分类补充一个“未分类”项
    for (const c of categories) {
      if (!c.hasItem) {
        await run(`INSERT INTO reason_items (categoryId, name, sort, status) VALUES (?, ?, ?, 'enabled')`, [c.id, '未分类', 0, 'enabled'])
      }
    }
    // 若没有任何分类，建立默认“其他/未分类”
    if (categories.length === 0) {
      const r = await run(`INSERT INTO reason_categories (name, sort, status) VALUES (?, ?, 'enabled')`, ['其他', 0])
      await run(`INSERT INTO reason_items (categoryId, name, sort, status) VALUES (?, ?, ?, 'enabled')`, [r.lastID, '未分类', 0, 'enabled'])
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 简单 JWT 校验中间件
function auth(req, res, next) {
  const h = String(req.headers['authorization'] || '')
  const m = h.match(/^Bearer\s+(.+)$/i)
  if (!m) return res.status(401).json({ error: '未授权' })
  try {
    req.user = jwt.verify(m[1], process.env.JWT_SECRET || 'dev-secret')
    next()
  } catch {
    return res.status(401).json({ error: '令牌无效' })
  }
}

// 仅管理员可写用户列表
app.put('/api/users', auth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' })
  const { users = [] } = req.body
  try {
    // 读取当前库中密码以便保留（防止前端未传 password 导致密码被清空）
    const rows = await all(`SELECT id, role, password FROM users`)
    const pwdMap = {}
    for (const r of rows) pwdMap[String(r.id)] = { role: String(r.role), password: String(r.password || '') }
    await run(`DELETE FROM users`)
    for (const u of users) {
      const id = String(u.id)
      const name = String(u.name)
      const role = String(u.role)
      const existing = pwdMap[id]
      // 优先使用传入的密码；否则保留原密码；再否则按角色使用默认值
      const password = (u.password != null && String(u.password) !== '')
        ? String(u.password)
        : (existing && existing.password ? existing.password : (id === 'admin' ? 'admin123' : '123456'))
      await run(`INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)`, [id, name, role, password])
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/approval-order', async (req, res) => {
  try {
    const rows = await all(`SELECT role FROM approval_order ORDER BY sort ASC`)
    res.json(rows.map(r => r.role))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/approval-order', auth, async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' })
  const { order } = req.body
  try {
    await run(`DELETE FROM approval_order`)
    for (let i = 0; i < order.length; i++) {
      await run(`INSERT INTO approval_order (role, sort) VALUES (?, ?)`, [order[i], i])
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/bills', async (req, res) => {
  try {
    const rows = await all(`SELECT b.*, u.name as submitterName FROM bills b LEFT JOIN users u ON b.createdBy = u.id ORDER BY b.date DESC, b.id DESC`)
    const parsed = rows.map(r => normalizeBillRow(r))
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Server-side filtered todos by role (duplicate kept in sync for now)
app.get('/api/todos/:role', async (req, res) => {
  try {
    const role = String(req.params.role || '').trim()
    const rows = await all(`SELECT b.*, u.name as submitterName FROM bills b LEFT JOIN users u ON b.createdBy = u.id WHERE b.status = 'pending' ORDER BY b.date DESC, b.id DESC`)
    const parsed = rows.map(r => normalizeBillRow(r)).filter(b => Array.isArray(b.steps) && b.steps[b.currentStepIndex] === role)
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/bills/archived', async (req, res) => {
  try {
    const rows = await all(`SELECT b.*, u.name as submitterName FROM bills b LEFT JOIN users u ON b.createdBy = u.id WHERE b.status = 'archived' ORDER BY b.date DESC, b.id DESC`)
    const parsed = rows.map(r => normalizeBillRow(r))
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/bill/:id', async (req, res) => {
  try {
    const rows = await all(`SELECT b.*, u.name as submitterName FROM bills b LEFT JOIN users u ON b.createdBy = u.id WHERE b.id = ? LIMIT 1`, [req.params.id])
    const r = rows[0]
    if (!r) return res.status(404).json({ error: '票据不存在' })
    const nr = normalizeBillRow(r)
    res.json(nr)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/bill', auth, async (req, res) => {
  try {
    const { title = '票据', amount = 0, category = '通用', date = new Date().toISOString().slice(0,10), projectId } = req.body || {}
    const createdBy = req.user?.id || 'admin'
    
    // 验证项目ID是否存在
    if (projectId) {
      const project = await all(`SELECT id FROM projects WHERE id = ?`, [projectId])
      if (project.length === 0) {
        return res.status(400).json({ error: '关联项目不存在' })
      }
    }
    
    // 动态审批流程逻辑
    let steps = await getStepsForCategory(category, Number(amount) || 0)

    const id = String(req.body?.id || (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))))
    const nowISO = new Date().toISOString()
    const history = [{ action: 'create', by: createdBy, time: nowISO }]
    const status = 'pending'
    const currentStepIndex = 0
    await run(`REPLACE INTO bills (id, title, amount, category, date, projectId, createdBy, status, steps, currentStepIndex, history, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      id, title, Number(amount) || 0, category, date, projectId, createdBy, status, JSON.stringify(steps), currentStepIndex, JSON.stringify(history), JSON.stringify([])
    ])
    res.json({ id, title, amount: Number(amount)||0, category, date, projectId, createdBy, status, steps, currentStepIndex, history, images: [] })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/bill/approve', auth, async (req, res) => {
  const { id } = req.body
  try {
    const rows = await all(`SELECT * FROM bills WHERE id = ?`, [id])
    const b = rows[0]
    if (!b) return res.status(404).json({ error: '票据不存在' })
    
    // 权限检查：必须是当前步骤的审批人，或者是管理员
    // normalize bill fields first
    try { b.steps = Array.isArray(b.steps) ? b.steps : JSON.parse(b.steps || '[]') } catch { b.steps = [] }
    b.currentStepIndex = Number(b.currentStepIndex)
    if (!Number.isFinite(b.currentStepIndex)) b.currentStepIndex = 0
    // Rebuild steps if needed (same logic as below)
    if (!Array.isArray(b.steps) || b.steps.length === 0) {
      b.steps = await getStepsForCategory(b.category, Number(b.amount) || 0)
      b.currentStepIndex = 0
    }
    
    const expectedRole = b.steps[b.currentStepIndex]
    const userRole = req.user?.role
    if (userRole !== 'admin' && userRole !== expectedRole) {
      return res.status(403).json({ error: `无权审批，当前需要: ${expectedRole}` })
    }

    // Continue with approval logic...
    // normalize bill fields (already done partly, but let's keep existing structure or merge)
    try { b.history = Array.isArray(b.history) ? b.history : JSON.parse(b.history || '[]') } catch { b.history = [] }
    if (!Array.isArray(b.history)) b.history = []
    try { b.images = Array.isArray(b.images) ? b.images : JSON.parse(b.images || '[]') } catch { b.images = [] }
    
    // clamp index
    if (b.currentStepIndex < 0 || b.currentStepIndex >= b.steps.length) b.currentStepIndex = 0
    
    if (b.status !== 'pending') return res.status(400).json({ error: '当前票据不在审批中' })
    const expected = b.steps[b.currentStepIndex] // Should match expectedRole
    
    const role = expected
    if (!b.date) b.date = new Date().toISOString().slice(0,10)
    
    console.log('approve debug', { id: b.id, expected: role, currentStepIndex: b.currentStepIndex, historyType: Array.isArray(b.history) ? 'array' : typeof b.history })
    
    b.history.push({ action: 'approve', role: role, operator: req.user?.name || req.user?.id, time: new Date().toISOString() })
    if (b.currentStepIndex < b.steps.length - 1) {
      b.currentStepIndex += 1
    } else {
      const finalRole = b.steps[b.currentStepIndex]
      b.status = (finalRole === 'finance_manager' || finalRole === 'accountant') ? 'archived' : 'approved'
    }
    await run(`REPLACE INTO bills (id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      b.id, b.title, Number(b.amount)||0, b.category, b.date, b.createdBy, b.status, JSON.stringify(b.steps||[]), Number(b.currentStepIndex)||0, JSON.stringify(b.history||[]), JSON.stringify(b.images||[])
    ])
    res.json(b)
  } catch (e) {
    console.error('approve error:', e)
    res.status(500).json({ error: e.message })
  }
})

// 仅发起人可删除未归档票据
app.delete('/api/bill/:id', auth, async (req, res) => {
  try {
    const billId = String(req.params.id || '')
    const rows = await all(`SELECT id, createdBy, status FROM bills WHERE id = ?`, [billId])
    const b = rows[0]
    if (!b) return res.status(404).json({ error: '票据不存在' })
    if (b.createdBy !== req.user?.id) return res.status(403).json({ error: '无权限删除他人票据' })
    if (b.status === 'archived') return res.status(400).json({ error: '已归档票据不可删除' })
    deleteBillImagesSync(billId)
    await run(`DELETE FROM bills WHERE id = ?`, [billId])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// helper: delete all images for a bill
function deleteBillImagesSync(billId) {
  const dir = path.join(UPLOAD_DIR, 'bills', billId)
  try {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
      for (const f of files) {
        const p = path.join(dir, f)
        try { fs.unlinkSync(p) } catch (e) { /* ignore */ }
      }
      fs.rmSync(dir, { recursive: true, force: true })
    }
  } catch (e) {
    // ignore
  }
}

app.post('/api/bill/reject', async (req, res) => {
  const { id, reason = '' } = req.body
  try {
    const rows = await all(`SELECT * FROM bills WHERE id = ?`, [id])
    const b = rows[0]
    if (!b) return res.status(404).json({ error: '票据不存在' })
    // normalize bill fields
    try { b.steps = Array.isArray(b.steps) ? b.steps : JSON.parse(b.steps || '[]') } catch { b.steps = [] }
    try { b.history = Array.isArray(b.history) ? b.history : JSON.parse(b.history || '[]') } catch { b.history = [] }
    if (!Array.isArray(b.history)) b.history = []
    try { b.images = Array.isArray(b.images) ? b.images : JSON.parse(b.images || '[]') } catch { b.images = [] }
    b.currentStepIndex = Number(b.currentStepIndex)
    if (!Number.isFinite(b.currentStepIndex)) b.currentStepIndex = 0
    if (!Array.isArray(b.steps) || b.steps.length === 0) {
      // 使用统一的审批流程逻辑
      b.steps = await getStepsForCategory(b.category, Number(b.amount) || 0)
      b.currentStepIndex = 0
    }
    if (b.currentStepIndex < 0 || b.currentStepIndex >= b.steps.length) b.currentStepIndex = 0
    if (b.status !== 'pending') return res.status(400).json({ error: '当前票据不在审批中' })
    const expected = b.steps[b.currentStepIndex]
    // 同 approve，直接以当前步骤为准
    const role = expected
    if (!b.date) b.date = new Date().toISOString().slice(0,10)
    // 拒绝策略：一级拒绝直接终止，其它级别退回上一级
    console.log('reject debug', { id: b.id, expected: role, currentStepIndex: b.currentStepIndex, historyType: Array.isArray(b.history) ? 'array' : typeof b.history, historyPreview: (() => { try { return JSON.stringify(b.history).slice(0, 120) } catch { return String(b.history) } })() })
    if (b.currentStepIndex === 0) {
      b.status = 'rejected'
      // 一级拒绝：最终拒绝并清空图片
      // 统一历史记录字段格式：demoteTo 使用“姓名(工号)”
      b.history.push({ action: 'reject', role, reason, time: new Date().toISOString() })
      b.status = 'rejected'
      deleteBillImagesSync(String(b.id))
      b.images = []
    } else {
      // 高级别拒绝：流程回退到前一审批人，保持 pending
      const demoteRole = b.steps[b.currentStepIndex - 1]
      const demoteTo = await formatAccountLabelForRole(demoteRole)
      b.history.push({ action: 'reject', role, reason, demoteTo, time: new Date().toISOString() })
      b.currentStepIndex = b.currentStepIndex - 1
      b.status = 'pending'
    }
    await run(`REPLACE INTO bills (id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      b.id, b.title, Number(b.amount)||0, b.category, b.date, b.createdBy, b.status, JSON.stringify(b.steps||[]), Number(b.currentStepIndex)||0, JSON.stringify(b.history||[]), JSON.stringify(b.images||[])
    ])
    res.json(b)
  } catch (e) {
    console.error('reject error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ===== 票据事由分级：CRUD 与排序 =====
// 列出所有分类及其二级项目
app.get('/api/reasons', async (req, res) => {
  try {
    const cats = await all(`SELECT id, name, sort, status FROM reason_categories ORDER BY sort ASC, id ASC`)
    const items = await all(`SELECT id, categoryId, name, sort, status FROM reason_items ORDER BY sort ASC, id ASC`)
    const grouped = cats.map(c => ({ ...c, items: items.filter(i => i.categoryId === c.id) }))
    res.json(grouped)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 一级分类：新增
app.post('/api/reasons/category', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' })
    const name = String(req.body?.name || '').trim()
    const sort = Number(req.body?.sort || 0)
    if (!name) return res.status(400).json({ error: '分类名称必填' })
    const r = await run(`INSERT INTO reason_categories (name, sort, status) VALUES (?, ?, 'enabled')`, [name, sort])
    res.json({ id: r.lastID, name, sort, status: 'enabled' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 一级分类：编辑
app.put('/api/reasons/category/:id', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' })
    const id = Number(req.params.id)
    const name = req.body?.name != null ? String(req.body.name).trim() : null
    const sort = req.body?.sort != null ? Number(req.body.sort) : null
    const status = req.body?.status != null ? String(req.body.status) : null
    const rows = await all(`SELECT id, name, sort, status FROM reason_categories WHERE id = ? LIMIT 1`, [id])
    const c = rows[0]
    if (!c) return res.status(404).json({ error: '分类不存在' })
    await run(`UPDATE reason_categories SET name = COALESCE(?, name), sort = COALESCE(?, sort), status = COALESCE(?, status) WHERE id = ?`, [name, sort, status, id])
    const updated = (await all(`SELECT id, name, sort, status FROM reason_categories WHERE id = ?`, [id]))[0]
    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 一级分类：删除（无二级项目且非“其他”才可删除）
app.delete('/api/reasons/category/:id', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' })
    const id = Number(req.params.id)
    const rows = await all(`SELECT id, name FROM reason_categories WHERE id = ? LIMIT 1`, [id])
    const c = rows[0]
    if (!c) return res.status(404).json({ error: '分类不存在' })
    if (String(c.name) === '其他') return res.status(400).json({ error: '默认分类不可删除' })
    const cnt = (await all(`SELECT COUNT(*) as c FROM reason_items WHERE categoryId = ?`, [id]))[0]?.c || 0
    if (cnt > 0) return res.status(400).json({ error: '存在二级项目，不能删除' })
    await run(`DELETE FROM reason_categories WHERE id = ?`, [id])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 二级项目：新增
app.post('/api/reasons/item', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' })
    const categoryId = Number(req.body?.categoryId)
    const name = String(req.body?.name || '').trim()
    const sort = Number(req.body?.sort || 0)
    if (!categoryId) return res.status(400).json({ error: '缺少所属一级分类' })
    if (!name) return res.status(400).json({ error: '项目名称必填' })
    const r = await run(`INSERT INTO reason_items (categoryId, name, sort, status) VALUES (?, ?, ?, 'enabled')`, [categoryId, name, sort])
    res.json({ id: r.lastID, categoryId, name, sort, status: 'enabled' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 二级项目：编辑
app.put('/api/reasons/item/:id', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' })
    const id = Number(req.params.id)
    const name = req.body?.name != null ? String(req.body.name).trim() : null
    const sort = req.body?.sort != null ? Number(req.body.sort) : null
    const status = req.body?.status != null ? String(req.body.status) : null
    const rows = await all(`SELECT id FROM reason_items WHERE id = ? LIMIT 1`, [id])
    const it = rows[0]
    if (!it) return res.status(404).json({ error: '项目不存在' })
    await run(`UPDATE reason_items SET name = COALESCE(?, name), sort = COALESCE(?, sort), status = COALESCE(?, status) WHERE id = ?`, [name, sort, status, id])
    const updated = (await all(`SELECT id, categoryId, name, sort, status FROM reason_items WHERE id = ?`, [id]))[0]
    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 二级项目：删除（需二次确认由前端控制，此处直接删除）
app.delete('/api/reasons/item/:id', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' })
    const id = Number(req.params.id)
    await run(`DELETE FROM reason_items WHERE id = ?`, [id])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 排序：批量更新一级分类顺序
app.post('/api/reasons/category/reorder', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' })
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(n=>Number(n)).filter(n=>Number.isFinite(n)) : []
    for (let i = 0; i < ids.length; i++) {
      await run(`UPDATE reason_categories SET sort = ? WHERE id = ?`, [i, ids[i]])
    }
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 排序：批量更新二级项目顺序（按所属分类）
app.post('/api/reasons/item/reorder', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' })
    const categoryId = Number(req.body?.categoryId)
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(n=>Number(n)).filter(n=>Number.isFinite(n)) : []
    if (!categoryId) return res.status(400).json({ error: '缺少分类' })
    const items = await all(`SELECT id FROM reason_items WHERE categoryId = ?`, [categoryId])
    const valid = new Set(items.map(i=>i.id))
    for (let i = 0; i < ids.length; i++) {
      if (valid.has(ids[i])) await run(`UPDATE reason_items SET sort = ? WHERE id = ?`, [i, ids[i]])
    }
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/bill/resubmit', auth, async (req, res) => {
  const { id, editorId, updates = {} } = req.body
  try {
    const rows = await all(`SELECT * FROM bills WHERE id = ?`, [id])
    const b = rows[0]
    if (!b) return res.status(404).json({ error: '票据不存在' })
    const steps = b.steps ? (Array.isArray(b.steps) ? b.steps : JSON.parse(b.steps)) : []
    const history = b.history ? (Array.isArray(b.history) ? b.history : JSON.parse(b.history)) : []
    const images = b.images ? (Array.isArray(b.images) ? b.images : JSON.parse(b.images)) : []
    if (b.status !== 'rejected') return res.status(400).json({ error: '当前票据未被拒绝' })
    if (b.createdBy !== editorId) return res.status(403).json({ error: '仅发起人可再次提交' })
    const lastReject = [...history].reverse().find(h => h.action === 'reject')
    if (!lastReject || lastReject.role !== 'approver1') return res.status(400).json({ error: '仅一级拒绝后可再次提交' })

    const before = { title: b.title, amount: Number(b.amount)||0, category: b.category, date: b.date }
    const after = {
      title: (updates.title ?? b.title),
      amount: Number(updates.amount ?? b.amount),
      category: (updates.category ?? b.category),
      date: (updates.date ?? b.date)
    }
    const changedFields = Object.keys(after).filter(k => String(before[k]) !== String(after[k]))
    const diff = { changed: changedFields.map(k => ({ field: k, before: before[k], after: after[k] })) }

    const nowISO = new Date().toISOString()
    const newId = (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8)))

    // 创建新票据（待审批，步骤重置到第一个）
    const newHistory = [
      { action: 'create', by: editorId, time: nowISO },
      { action: 'resubmit_from', from: String(id), time: nowISO }
    ]
    await run(`REPLACE INTO bills (id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history, images, relatedId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      newId, after.title, after.amount, after.category, after.date, b.createdBy, 'pending', JSON.stringify(steps), 0, JSON.stringify(newHistory), JSON.stringify([]), String(id)
    ])

    // 更新原票据：标记为已拒绝-已修改，建立关联并记录变更
    history.push({ action: 'modified', by: editorId, time: nowISO, nextId: newId })
    await run(`REPLACE INTO bills (id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history, images, relatedId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      String(id), b.title, Number(b.amount)||0, b.category, b.date, b.createdBy, 'rejected-modified', JSON.stringify(steps), Number(b.currentStepIndex)||0, JSON.stringify(history), JSON.stringify(images), newId
    ])

    // 记录修改历史
    await run(`INSERT INTO bill_edits (originalId, newId, editorId, time, diff) VALUES (?, ?, ?, ?, ?)`, [
      String(id), newId, editorId, nowISO, JSON.stringify(diff)
    ])

    res.json({ id: newId, title: after.title, amount: after.amount, category: after.category, date: after.date, createdBy: b.createdBy, status: 'pending', steps, currentStepIndex: 0, history: newHistory, images: [], relatedId: String(id) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 图片上传：支持多图，字段名 images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const billId = String(req.params.id || '')
    const dir = path.join(UPLOAD_DIR, 'bills', billId)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.jpg'
    const name = `${Date.now()}-${Math.round(Math.random()*1e6)}${ext}`
    cb(null, name)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('仅支持图片文件'))
    }
    const ext = path.extname(file.originalname || '').toLowerCase()
    const allowed = ['.jpg', '.jpeg', '.png', '.webp']
    if (!allowed.includes(ext)) {
      return cb(new Error('不支持的图片格式'))
    }
    cb(null, true)
  }
})

app.post('/api/bill/:id/upload', auth, upload.array('images', 5), async (req, res) => {
  const billId = String(req.params.id || '')
  try {
    const rows = await all(`SELECT * FROM bills WHERE id = ?`, [billId])
    const b = rows[0]
    if (!b) return res.status(404).json({ error: '票据不存在' })
    const files = (req.files || [])
    const rels = files.map(f => {
      const rel = path.relative(UPLOAD_DIR, f.path).replace(/\\+/g, '/')
      return '/uploads/' + rel
    })
    const existing = b.images ? (Array.isArray(b.images) ? b.images : JSON.parse(b.images || '[]')) : []
    const merged = existing.concat(rels)
    b.images = merged
    await run(`REPLACE INTO bills (id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      b.id, b.title, b.amount, b.category, b.date, b.createdBy, b.status, JSON.stringify(b.steps || []), b.currentStepIndex, JSON.stringify(b.history || []), JSON.stringify(merged)
    ])
    res.json({ ok: true, images: merged })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Helper for dynamic steps based on item/category
// 审批流程：
// - 工程款项：总经理(gm/李长春) → 董事长(chairman/李总)
// - 后勤花费：副董事长(vice_chairman/孙总) → 董事长(chairman/李总)
// - 其他类型：按审批顺序 → 董事长(chairman/李总)
async function getStepsForCategory(catInput, amt) {
  // 1. Try to find item match to get parent category
  let parentCat = ''
  try {
    const itemRows = await all(`
      SELECT c.name as parentName 
      FROM reason_items i 
      JOIN reason_categories c ON i.categoryId = c.id 
      WHERE i.name = ?
    `, [catInput])
    if (itemRows.length > 0) {
      parentCat = itemRows[0].parentName
    }
  } catch (e) { /* ignore */ }

  const checkStr = (parentCat || catInput || '').toString()

  if (checkStr.includes('工程')) {
    // 工程款项：总经理(李长春) → 董事长(李总) → 财务经理
    return ['gm', 'chairman', 'finance_manager']
  } else if (checkStr.includes('后勤')) {
    // 后勤花费：副董事长(孙总) → 董事长(李总) → 财务经理
    return ['vice_chairman', 'chairman', 'finance_manager']
  } else {
    // 其他类型：按审批顺序（无免审阈值）→ 董事长 → 财务经理
    const orows = await all(`SELECT role FROM approval_order ORDER BY sort ASC`)
    let order = orows.map(r => r.role)
    if (!Array.isArray(order) || order.length === 0) {
      order = ['approver1', 'approver2', 'approver3']
    }
    // 直接使用审批顺序，不再应用免审阈值
    return [...order, 'chairman', 'finance_manager']
  }
}

const PORT = process.env.PORT || 3001
;(async () => {
  await ensureSchema()
  await seedIfEmpty()
  app.listen(PORT, () => {
    // 打印本机可访问地址（回环地址 + 局域网 IPv4）
    const ifaces = os.networkInterfaces()
    const addrs = []
    for (const name of Object.keys(ifaces)) {
      for (const i of (ifaces[name] || [])) {
        if (i.family === 'IPv4') addrs.push(i.address)
      }
    }
    const originList = ['http://127.0.0.1:' + PORT].concat(addrs.map(a=>`http://${a}:${PORT}`))
    console.log('Server running on:\n' + originList.join('\n'))
  })
})()

app.get('/api/bill/:id/edits', async (req, res) => {
  try {
    const id = String(req.params.id)
    const rows = await all(`SELECT id, originalId, newId, editorId, time, diff FROM bill_edits WHERE originalId = ? OR newId = ? ORDER BY time DESC`, [id, id])
    const parsed = rows.map(r => ({ ...r, diff: (()=>{ try { return JSON.parse(r.diff||'{}') } catch { return {} } })() }))
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ===== 项目管理 API =====
// 生成项目编码: HN-year-month-day-000
async function generateProjectCode() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const prefix = `HN-${year}-${month}-${day}`
  const rows = await all(`SELECT code FROM projects WHERE code LIKE ? ORDER BY code DESC LIMIT 1`, [`${prefix}-%`])
  let seq = 1
  if (rows.length > 0) {
    const lastCode = rows[0].code
    const lastSeq = parseInt(lastCode.split('-').pop(), 10)
    if (!isNaN(lastSeq)) seq = lastSeq + 1
  }
  return `${prefix}-${String(seq).padStart(3, '0')}`
}

// 生成合同编码: HN-HT-year-month-day-000
async function generateContractCode() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const prefix = `HN-HT-${year}-${month}-${day}`
  const rows = await all(`SELECT contractNo FROM supplier_contracts WHERE contractNo LIKE ? ORDER BY contractNo DESC LIMIT 1`, [`${prefix}-%`])
  let seq = 1
  if (rows.length > 0) {
    const lastCode = rows[0].contractNo
    const lastSeq = parseInt(lastCode.split('-').pop(), 10)
    if (!isNaN(lastSeq)) seq = lastSeq + 1
  }
  return `${prefix}-${String(seq).padStart(3, '0')}`
}

// 项目文件上传配置
const projectStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'projects')
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || ''
    const name = `${Date.now()}-${Math.round(Math.random()*1e6)}${ext}`
    cb(null, name)
  }
})
const projectUpload = multer({ storage: projectStorage, limits: { fileSize: 50 * 1024 * 1024 } })

// 获取所有项目
app.get('/api/projects', auth, async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM projects ORDER BY createdAt DESC`)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 创建项目
app.post('/api/projects', auth, projectUpload.single('contract'), async (req, res) => {
  try {
    const id = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
    const code = await generateProjectCode()
    const now = new Date().toISOString()
    const { name, client, contractNo, totalBudget, duration, clientFinancialInfo, projectOverview, settlementAmount, paymentMethod, invoiceInfo } = req.body
    
    let contractFileUrl = null
    if (req.file) {
      contractFileUrl = '/uploads/projects/' + req.file.filename
    }
    
    const budget = Number(totalBudget) || 0
    await run(`INSERT INTO projects (id, code, name, client, contractNo, totalBudget, balance, duration, clientFinancialInfo, projectOverview, settlementAmount, paymentMethod, invoiceInfo, contractFileUrl, approvalStatus, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      [id, code, name, client, contractNo, budget, budget, duration, clientFinancialInfo, projectOverview, Number(settlementAmount) || 0, paymentMethod, invoiceInfo, contractFileUrl, req.user?.id, now, now])
    
    const project = (await all(`SELECT * FROM projects WHERE id = ?`, [id]))[0]
    res.json(project)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 更新项目
app.put('/api/projects/:id', auth, projectUpload.single('contract'), async (req, res) => {
  try {
    const projectId = req.params.id
    const existing = (await all(`SELECT * FROM projects WHERE id = ?`, [projectId]))[0]
    if (!existing) return res.status(404).json({ error: '项目不存在' })
    
    const { name, client, contractNo, totalBudget, duration, clientFinancialInfo, projectOverview, settlementAmount, paymentMethod, invoiceInfo } = req.body
    const now = new Date().toISOString()
    
    let contractFileUrl = existing.contractFileUrl
    if (req.file) {
      contractFileUrl = '/uploads/projects/' + req.file.filename
    }
    
    const budget = Number(totalBudget) || existing.totalBudget
    const oldBudget = Number(existing.totalBudget) || 0
    const oldBalance = Number(existing.balance) || 0
    const newBalance = oldBalance + (budget - oldBudget)
    
    await run(`UPDATE projects SET name = ?, client = ?, contractNo = ?, totalBudget = ?, balance = ?, duration = ?, clientFinancialInfo = ?, projectOverview = ?, settlementAmount = ?, paymentMethod = ?, invoiceInfo = ?, contractFileUrl = ?, updatedAt = ? WHERE id = ?`,
      [name, client, contractNo, budget, newBalance, duration, clientFinancialInfo, projectOverview, Number(settlementAmount) || 0, paymentMethod, invoiceInfo, contractFileUrl, now, projectId])
    
    // 记录变更
    await run(`INSERT INTO project_changes (projectId, changeType, changeData, changedBy, changedAt) VALUES (?, ?, ?, ?, ?)`,
      [projectId, 'update', JSON.stringify({ name, client, contractNo, totalBudget, duration }), req.user?.id, now])
    
    // 发送通知给董事长和总经理
    const chairmanUsers = await all(`SELECT * FROM users WHERE role = 'chairman'`)
    const gmUsers = await all(`SELECT * FROM users WHERE role = 'gm'`)
    const notificationUsers = [...chairmanUsers, ...gmUsers]
    
    for (const user of notificationUsers) {
      const notificationId = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
      await run(`INSERT INTO notifications (id, userId, title, message, type, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [notificationId, user.id, '项目信息变更通知', `项目"${name}"信息已更新`, 'update', 0, now])
    }
    
    const project = (await all(`SELECT * FROM projects WHERE id = ?`, [projectId]))[0]
    res.json(project)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 删除项目
app.delete('/api/projects/:id', auth, async (req, res) => {
  try {
    const projectId = req.params.id
    await run(`DELETE FROM materials WHERE projectId = ?`, [projectId])
    await run(`DELETE FROM supplier_contracts WHERE projectId = ?`, [projectId])
    await run(`DELETE FROM project_changes WHERE projectId = ?`, [projectId])
    await run(`DELETE FROM projects WHERE id = ?`, [projectId])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 提交项目审批
app.post('/api/projects/:id/submit', auth, async (req, res) => {
  try {
    const projectId = req.params.id
    const now = new Date().toISOString()
    await run(`UPDATE projects SET approvalStatus = 'pending', updatedAt = ? WHERE id = ?`, [now, projectId])
    const project = (await all(`SELECT * FROM projects WHERE id = ?`, [projectId]))[0]
    res.json(project)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 审批项目
app.post('/api/projects/:id/approve', auth, async (req, res) => {
  try {
    const projectId = req.params.id
    const { approved, comments } = req.body
    const now = new Date().toISOString()
    const status = approved ? 'approved' : 'rejected'
    await run(`UPDATE projects SET approvalStatus = ?, updatedAt = ? WHERE id = ?`, [status, now, projectId])
    
    // 记录变更
    await run(`INSERT INTO project_changes (projectId, changeType, changeData, changedBy, changedAt) VALUES (?, ?, ?, ?, ?)`,
      [projectId, 'approval', JSON.stringify({ approved, comments }), req.user?.id, now])
    
    const project = (await all(`SELECT * FROM projects WHERE id = ?`, [projectId]))[0]
    
    // 发送通知给董事长和总经理
    const chairmanUsers = await all(`SELECT * FROM users WHERE role = 'chairman'`)
    const gmUsers = await all(`SELECT * FROM users WHERE role = 'gm'`)
    const notificationUsers = [...chairmanUsers, ...gmUsers]
    
    const statusText = approved ? '已通过审批' : '审批被拒绝'
    for (const user of notificationUsers) {
      const notificationId = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
      await run(`INSERT INTO notifications (id, userId, title, message, type, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [notificationId, user.id, '项目审批通知', `项目"${project.name}"${statusText}`, 'approval', 0, now])
    }
    
    res.json(project)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 获取项目变更记录
app.get('/api/projects/:id/changes', auth, async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM project_changes WHERE projectId = ? ORDER BY changedAt DESC`, [req.params.id])
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 上传项目附件
app.post('/api/projects/:id/attachments', auth, projectUpload.array('files', 10), async (req, res) => {
  try {
    const files = (req.files || []).map(f => '/uploads/projects/' + f.filename)
    res.json({ files })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ===== 供应商 API =====
app.get('/api/suppliers', auth, async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM suppliers WHERE status = 'active' ORDER BY name ASC`)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/suppliers', auth, async (req, res) => {
  try {
    const id = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
    const now = new Date().toISOString()
    const { name, contact, phone, address, bankAccount, taxNo, category } = req.body
    
    await run(`INSERT INTO suppliers (id, name, contact, phone, address, bankAccount, taxNo, category, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, name, contact, phone, address, bankAccount, taxNo, category, now, now])
    
    const supplier = (await all(`SELECT * FROM suppliers WHERE id = ?`, [id]))[0]
    res.json(supplier)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/suppliers/:id', auth, async (req, res) => {
  try {
    const { name, contact, phone, address, bankAccount, taxNo, category, rating, status } = req.body
    const now = new Date().toISOString()
    await run(`UPDATE suppliers SET name = ?, contact = ?, phone = ?, address = ?, bankAccount = ?, taxNo = ?, category = ?, rating = ?, status = ?, updatedAt = ? WHERE id = ?`,
      [name, contact, phone, address, bankAccount, taxNo, category, rating || 0, status || 'active', now, req.params.id])
    const supplier = (await all(`SELECT * FROM suppliers WHERE id = ?`, [req.params.id]))[0]
    res.json(supplier)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/suppliers/:id', auth, async (req, res) => {
  try {
    await run(`UPDATE suppliers SET status = 'deleted' WHERE id = ?`, [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})


// ===== 供应商合同 API =====
// 合同文件上传配置
const contractStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'contracts')
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || ''
    const name = `${Date.now()}-${Math.round(Math.random()*1e6)}${ext}`
    cb(null, name)
  }
})
const contractUpload = multer({ storage: contractStorage, limits: { fileSize: 50 * 1024 * 1024 } })

const contractTemplateDir = path.join(UPLOAD_DIR, 'contract-templates')
const contractTemplateMetaPath = path.join(contractTemplateDir, 'current.json')
const legacyContractTemplateFileName = 'current.docx'
const legacyContractTemplateAbsPath = path.join(contractTemplateDir, legacyContractTemplateFileName)
function getCurrentContractTemplateMeta() {
  try {
    if (fs.existsSync(contractTemplateMetaPath)) {
      const meta = JSON.parse(fs.readFileSync(contractTemplateMetaPath, 'utf8'))
      const fileNameInMeta = String(meta?.fileName || '').trim().toLowerCase()
      if (fileNameInMeta === legacyContractTemplateFileName.toLowerCase() && fs.existsSync(legacyContractTemplateAbsPath)) {
        return {
          fileName: legacyContractTemplateFileName,
          fileUrl: `/uploads/contract-templates/${legacyContractTemplateFileName}`,
          absPath: legacyContractTemplateAbsPath,
        }
      }
      const directAbsPath = String(meta?.absPath || '').trim()
      const fileUrlBaseName = path.basename(String(meta?.fileUrl || '').trim())
      const fileNameBaseName = path.basename(String(meta?.fileName || '').trim())
      const fallbackCandidates = [
        fileUrlBaseName ? path.join(contractTemplateDir, fileUrlBaseName) : '',
        fileNameBaseName ? path.join(contractTemplateDir, fileNameBaseName) : '',
      ].filter(Boolean)
      const resolvedAbsPath = (directAbsPath && fs.existsSync(directAbsPath))
        ? directAbsPath
        : fallbackCandidates.find((p) => fs.existsSync(p)) || ''
      if (resolvedAbsPath) {
        return {
          fileName: String(meta.fileName || path.basename(resolvedAbsPath)),
          fileUrl: String(meta.fileUrl || `/uploads/contract-templates/${path.basename(resolvedAbsPath)}`),
          absPath: resolvedAbsPath,
        }
      }
    }
  } catch {
    // ignore metadata parse errors
  }
  if (fs.existsSync(legacyContractTemplateAbsPath)) {
    return {
      fileName: legacyContractTemplateFileName,
      fileUrl: `/uploads/contract-templates/${legacyContractTemplateFileName}`,
      absPath: legacyContractTemplateAbsPath,
    }
  }
  return null
}
const contractTemplateUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(contractTemplateDir, { recursive: true })
      cb(null, contractTemplateDir)
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '') || '.docx'
      cb(null, `tpl-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`)
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
})

app.get('/api/supplier-contract-template', auth, async (req, res) => {
  try {
    const meta = getCurrentContractTemplateMeta()
    if (!meta) return res.json(null)
    const st = fs.statSync(meta.absPath)
    res.json({
      fileName: meta.fileName,
      fileUrl: meta.fileUrl,
      updatedAt: new Date(st.mtimeMs).toISOString(),
      size: st.size,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/supplier-contract-template', auth, contractTemplateUpload.single('templateFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'template file required' })
    const uploadedAbsPath = path.join(contractTemplateDir, req.file.filename)
    const uploadedUrl = `/uploads/contract-templates/${req.file.filename}`
    fs.writeFileSync(contractTemplateMetaPath, JSON.stringify({
      fileName: req.file.originalname || req.file.filename,
      fileUrl: uploadedUrl,
      absPath: uploadedAbsPath,
      updatedAt: new Date().toISOString(),
    }, null, 2))
    const st = fs.statSync(uploadedAbsPath)
    res.json({
      fileName: req.file.originalname || req.file.filename,
      fileUrl: uploadedUrl,
      updatedAt: new Date(st.mtimeMs).toISOString(),
      size: st.size,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 获取合同列表
app.get('/api/supplier-contracts', auth, async (req, res) => {
  try {
    const { projectId, includeArchived } = req.query
    let sql = `SELECT * FROM supplier_contracts WHERE 1=1`
    const params = []
    
    if (projectId) {
      sql += ` AND projectId = ?`
      params.push(projectId)
    }
    
    if (includeArchived !== 'true') {
      sql += ` AND isArchived = 0`
    }
    
    sql += ` ORDER BY createdAt DESC`
    const rows = await all(sql, params)
    
    // 解析materialList
    const parsed = rows.map(r => ({
      ...r,
      materialList: (() => { try { return JSON.parse(r.materialList || '[]') } catch { return [] } })()
    }))
    
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 创建合同
app.post('/api/supplier-contracts', auth, contractUpload.single('contractFile'), async (req, res) => {
  try {
    const id = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
    const contractNo = await generateContractCode()
    const now = new Date().toISOString()
    
    const {
      projectId,
      contractName,
      supplierId,
      supplierName,
      supplierAddress,
      contactPerson,
      contactPhone,
      contractAmount,
      paymentMethod,
      materialList,
      deliveryLocation,
      buyerName,
      buyerAddress,
      buyerBankName,
      buyerBankAccount,
      supplierBankName,
      supplierBankAccount,
      buyerAgent,
      supplierAgent,
      amountExclTax,
      taxAmount,
      contractAmountUpper,
      dateText,
      signDate,
      startDate,
      endDate,
      warrantyPeriod,
      qualityStandard,
      receiver,
      status,
    } = req.body
    
    let contractFileUrl = null
    if (req.file) {
      contractFileUrl = '/uploads/contracts/' + req.file.filename
    }
    
    // 解析材料清单
    let materials = []
    try {
      materials = typeof materialList === 'string' ? JSON.parse(materialList) : (materialList || [])
    } catch { materials = [] }
    
    await run(
      `INSERT INTO supplier_contracts (
        id, contractNo, contractName, projectId, supplierId, supplierName, supplierAddress, contactPerson, contactPhone,
        contractAmount, paymentMethod,
        materialList, contractFileUrl, deliveryLocation, buyerName, buyerAddress, buyerBankName, buyerBankAccount,
        supplierBankName, supplierBankAccount, buyerAgent, supplierAgent,
        amountExclTax, taxAmount, contractAmountUpper, dateText, signDate, startDate, endDate, warrantyPeriod, qualityStandard, receiver,
        status, approvalStatus, isArchived, createdBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
      [
        id,
        contractNo,
        contractName,
        projectId,
        supplierId,
        supplierName,
        supplierAddress || null,
        contactPerson || null,
        contactPhone || null,
        Number(contractAmount) || 0,
        paymentMethod,
        JSON.stringify(materials),
        contractFileUrl,
        deliveryLocation || null,
        buyerName || null,
        buyerAddress || null,
        buyerBankName || null,
        buyerBankAccount || null,
        supplierBankName || buyerBankName || null,
        supplierBankAccount || buyerBankAccount || null,
        buyerAgent || null,
        supplierAgent || null,
        Number(amountExclTax) || 0,
        Number(taxAmount) || 0,
        contractAmountUpper || null,
        dateText || null,
        signDate || null,
        startDate || null,
        endDate || null,
        warrantyPeriod || null,
        qualityStandard || null,
        receiver || null,
        req.user?.id,
        now,
        now,
      ]
    )
    
    // 同步材料到项目材料清单
    if (materials.length > 0 && projectId) {
      for (const m of materials) {
        const matId = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
        await run(`INSERT INTO materials (id, projectId, name, specification, unit, quantity, unitPrice, totalPrice, remarks, supplier, type, contractId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [matId, projectId, m.name, m.specification, m.unit, Number(m.quantity) || 0, Number(m.unitPrice) || 0, Number(m.totalPrice) || 0, m.remarks, supplierName, m.category || '材料清单', id, now, now])
      }
    }
    
    const contract = (await all(`SELECT * FROM supplier_contracts WHERE id = ?`, [id]))[0]
    contract.materialList = materials
    res.json(contract)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 更新合同
app.put('/api/supplier-contracts/:id', auth, contractUpload.single('contractFile'), async (req, res) => {
  try {
    const contractId = req.params.id
    const existing = (await all(`SELECT * FROM supplier_contracts WHERE id = ?`, [contractId]))[0]
    if (!existing) return res.status(404).json({ error: '合同不存在' })
    
    const {
      contractName,
      supplierId,
      supplierName,
      supplierAddress,
      contactPerson,
      contactPhone,
      contractAmount,
      paymentMethod,
      materialList,
      deliveryLocation,
      buyerName,
      buyerAddress,
      buyerBankName,
      buyerBankAccount,
      supplierBankName,
      supplierBankAccount,
      buyerAgent,
      supplierAgent,
      amountExclTax,
      taxAmount,
      contractAmountUpper,
      dateText,
      signDate,
      startDate,
      endDate,
      warrantyPeriod,
      qualityStandard,
      receiver,
      status,
      contractNo,
    } = req.body
    const now = new Date().toISOString()
    
    let contractFileUrl = existing.contractFileUrl
    if (req.file) {
      contractFileUrl = '/uploads/contracts/' + req.file.filename
    }
    
    let materials = []
    try {
      materials = typeof materialList === 'string' ? JSON.parse(materialList) : (materialList || [])
    } catch { materials = [] }
    
    await run(
      `UPDATE supplier_contracts
       SET contractName = ?, supplierId = ?, supplierName = ?, supplierAddress = ?, contactPerson = ?, contactPhone = ?,
           contractAmount = ?, paymentMethod = ?,
           materialList = ?, contractFileUrl = ?, deliveryLocation = ?, buyerName = ?, buyerAddress = ?,
           buyerBankName = ?, buyerBankAccount = ?, supplierBankName = ?, supplierBankAccount = ?,
           buyerAgent = ?, supplierAgent = ?, amountExclTax = ?, taxAmount = ?,
           contractAmountUpper = ?, dateText = ?, signDate = ?, startDate = ?, endDate = ?, warrantyPeriod = ?, qualityStandard = ?, receiver = ?, status = ?, contractNo = ?, updatedAt = ?
       WHERE id = ?`,
      [
        contractName,
        supplierId,
        supplierName,
        supplierAddress || null,
        contactPerson || null,
        contactPhone || null,
        Number(contractAmount) || 0,
        paymentMethod,
        JSON.stringify(materials),
        contractFileUrl,
        deliveryLocation || null,
        buyerName || null,
        buyerAddress || null,
        buyerBankName || null,
        buyerBankAccount || null,
        supplierBankName || buyerBankName || null,
        supplierBankAccount || buyerBankAccount || null,
        buyerAgent || null,
        supplierAgent || null,
        Number(amountExclTax) || 0,
        Number(taxAmount) || 0,
        contractAmountUpper || null,
        dateText || null,
        signDate || null,
        startDate || null,
        endDate || null,
        warrantyPeriod || null,
        qualityStandard || null,
        receiver || null,
        status || existing.status || 'draft',
        contractNo || existing.contractNo,
        now,
        contractId,
      ]
    )
    
    const contract = (await all(`SELECT * FROM supplier_contracts WHERE id = ?`, [contractId]))[0]
    contract.materialList = materials
    res.json(contract)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 删除合同
app.get('/api/supplier-contracts/:id/export-word', auth, async (req, res) => {
  try {
    const contractId = req.params.id
    const contract = (await all(`SELECT * FROM supplier_contracts WHERE id = ? LIMIT 1`, [contractId]))[0]
    if (!contract) return res.status(404).json({ error: 'contract not found' })

    const safeName = String(contract.contractName || 'contract').replace(/[\\/:*?"<>|]+/g, '_')
    const downloadName = `${safeName}.docx`

    // Render by template: prefer uploaded current template, then local fallback templates.
    const currentTemplateMeta = getCurrentContractTemplateMeta()
    const templateCandidates = [
      currentTemplateMeta?.absPath,
      path.join(__dirname, '..', 'contract_template_system_ready_v2.docx'),
      path.join(__dirname, '..', 'contract_template_system_ready.docx'),
    ]
    const templatePath = templateCandidates.find((p) => fs.existsSync(p))
    const templateSource = templatePath === currentTemplateMeta?.absPath ? 'uploaded-current' : 'fallback-default'
    const enableLegacyMarkers = templateSource !== 'uploaded-current'
    if (!templatePath) {
      return res.status(404).json({ error: 'template missing' })
    }
    res.setHeader('X-Contract-Template-Source', templateSource)
    res.setHeader('X-Contract-Template-Path', templatePath)

    const signDate = String(contract.signDate || '')
    const dateText = String(contract.dateText || '')
    const year = signDate.length >= 4 ? signDate.slice(0, 4) : ''
    const month = signDate.length >= 7 ? signDate.slice(5, 7) : ''
    const day = signDate.length >= 10 ? signDate.slice(8, 10) : ''
    let materialRows = parseJsonArraySafe(contract.materialList || '[]')
    if (!Array.isArray(materialRows) || materialRows.length === 0) {
      materialRows = await all(
        `SELECT name, specification, unit, quantity, unitPrice, totalPrice
         FROM materials WHERE contractId = ? ORDER BY datetime(createdAt) ASC, createdAt ASC`,
        [contract.id]
      )
    }
    if ((!Array.isArray(materialRows) || materialRows.length === 0) && contract.projectId) {
      materialRows = await all(
        `SELECT name, specification, unit, quantity, unitPrice, totalPrice
         FROM materials WHERE projectId = ? ORDER BY datetime(createdAt) ASC, createdAt ASC`,
        [contract.projectId]
      )
    }
    const projectRow = contract.projectId
      ? (await all(`SELECT name FROM projects WHERE id = ? LIMIT 1`, [contract.projectId]))[0]
      : null

    const MATERIAL_TABLE_MARKER = '__MATERIAL_TABLE_BLOCK__'
    const renderData = {
      contract_no: contract.contractNo || '',
      contract_name: contract.contractName || '',
      supplier_name: contract.supplierName || '',
      supplier_address: contract.supplierAddress || contract.buyerAddress || '',
      contact_person: contract.contactPerson || '',
      contact_phone: contract.contactPhone || '',
      contact_with_phone: [contract.contactPerson || '', contract.contactPhone || ''].filter(Boolean).join(' '),
      buyer_name: contract.buyerName || '',
      buyer_address: contract.buyerAddress || '',
      buyer_bank_name: contract.buyerBankName || '',
      buyer_bank_account: contract.buyerBankAccount || '',
      supplier_bank_name: contract.supplierBankName || contract.buyerBankName || '',
      supplier_bank_account: contract.supplierBankAccount || contract.buyerBankAccount || '',
      buyer_agent: contract.buyerAgent || '',
      supplier_agent: contract.supplierAgent || '',
      delivery_location: contract.deliveryLocation || '',
      receiver: contract.receiver || '',
      payment_method: contract.paymentMethod || '',
      contract_amount: Number(contract.contractAmount || 0).toFixed(2),
      amount_excl_tax: Number(contract.amountExclTax || 0).toFixed(2),
      tax_amount: Number(contract.taxAmount || 0).toFixed(2),
      contract_amount_upper: contract.contractAmountUpper || '',
      sign_date: signDate,
      date_text: dateText || (year && month && day ? `${year}年${month}月${day}日` : ''),
      sign_year: year,
      sign_month: month,
      sign_day: day,
      material_list: MATERIAL_TABLE_MARKER,
      project_name: projectRow?.name || '',
    }

    const templateBinary = fs.readFileSync(templatePath, 'binary')
    const escapeRegExp = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const escapeXmlText = (v) => String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
    const toWordTextXml = (v) => escapeXmlText(v).replace(/\r?\n/g, '</w:t><w:br/><w:t>')
    const buildMaterialTableXml = (rows) => {
      const header = ['\u5e8f\u53f7', '\u7269\u6599\u540d\u79f0', '\u89c4\u683c\u578b\u53f7', '\u5355\u4f4d', '\u6570\u91cf', '\u5355\u4ef7', '\u91d1\u989d']
      const widths = [900, 2500, 1900, 900, 900, 1200, 1300]
      const rowData = Array.isArray(rows) && rows.length > 0
        ? rows.map((m, i) => [
            String(i + 1),
            String(m?.name ?? ''),
            String(m?.specification ?? ''),
            String(m?.unit ?? ''),
            String(m?.quantity ?? ''),
            String(m?.unitPrice ?? ''),
            String(m?.totalPrice ?? ''),
          ])
        : [['1', '-', '-', '-', '-', '-', '-']]
      const renderRow = (cells, bold = false) => (
        `<w:tr>${
          cells.map((cell, i) => (
            `<w:tc><w:tcPr><w:tcW w:w="${widths[i]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:ind w:left="0" w:right="0" w:firstLine="0" w:hanging="0"/><w:jc w:val="${i === 1 || i === 2 ? 'left' : 'center'}"/></w:pPr><w:r>${
              bold ? '<w:rPr><w:b/></w:rPr>' : ''
            }<w:t>${escapeXmlText(String(cell ?? ''))}</w:t></w:r></w:p></w:tc>`
          )).join('')
        }</w:tr>`
      )
      const grid = widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')
      return (
        `<w:tbl>` +
          `<w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/><w:tblBorders>` +
            `<w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/>` +
            `<w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/>` +
            `<w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>` +
            `<w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/>` +
            `<w:insideH w:val="single" w:sz="6" w:space="0" w:color="000000"/>` +
            `<w:insideV w:val="single" w:sz="6" w:space="0" w:color="000000"/>` +
          `</w:tblBorders></w:tblPr>` +
          `<w:tblGrid>${grid}</w:tblGrid>` +
          renderRow(header, true) +
          rowData.map((r) => renderRow(r)).join('') +
        `</w:tbl>`
      )
    }
    const injectMaterialTableXml = (xml, tableXml) => {
      if (!xml || !xml.includes(MATERIAL_TABLE_MARKER)) return xml
      const markerPattern = escapeRegExp(MATERIAL_TABLE_MARKER)
      const paraRegex = new RegExp(`<w:p\\b[^>]*>(?:(?!<\\/w:p>)[\\s\\S])*?${markerPattern}(?:(?!<\\/w:p>)[\\s\\S])*?<\\/w:p>`, 'g')
      if (paraRegex.test(xml)) {
        return xml.replace(paraRegex, tableXml)
      }
      return xml.split(MATERIAL_TABLE_MARKER).join(tableXml)
    }
    const applyXmlReplacement = (xml, key, value) => {
      const exact = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, 'g')
      return xml.replace(exact, value)
    }
    const applySplitXmlReplacement = (xml, key, value) => {
      const separator = '(?:<[^>]+>|\\s|&nbsp;|&#160;|&#xA0;)*'
      const splitKey = String(key)
        .split('')
        .map((ch) => `${escapeRegExp(ch)}${separator}`)
        .join('')
      const splitTag = new RegExp(`\\{\\{${separator}${splitKey}\\}\\}`, 'g')
      return xml.replace(splitTag, value)
    }

    let outputBuffer = null
    try {
      const zip = new PizZip(templateBinary)
      if (enableLegacyMarkers && LEGACY_TEMPLATE_MARKERS.size > 0) {
        const xmlParts = Object.keys(zip.files).filter((name) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(name))
        for (const partName of xmlParts) {
          const part = zip.file(partName)
          if (!part) continue
          let xml = part.asText()
          for (const [fromText, renderKey] of LEGACY_TEMPLATE_MARKERS.entries()) {
            const val = String(renderData?.[renderKey] ?? '')
            if (!val) continue
            if (!xml.includes(fromText)) continue
            xml = xml.split(fromText).join(val)
          }
          zip.file(partName, xml)
        }
      }
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '',
      })
      doc.render(renderData)
      outputBuffer = doc.getZip().generate({ type: 'nodebuffer' })
    } catch {
      // Fallback for malformed templates: plain placeholder replacement in xml parts.
      const zip = new PizZip(templateBinary)
      const xmlParts = Object.keys(zip.files).filter((name) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(name))
      const replacements = Object.entries(renderData).map(([k, v]) => [k, toWordTextXml(String(v ?? ''))])
      for (const partName of xmlParts) {
        const part = zip.file(partName)
        if (!part) continue
        let xml = part.asText()
        if (enableLegacyMarkers) {
          for (const [fromText, renderKey] of LEGACY_TEMPLATE_MARKERS.entries()) {
            const val = String(renderData?.[renderKey] ?? '')
            if (!val) continue
            if (!xml.includes(fromText)) continue
            xml = xml.split(fromText).join(val)
          }
        }
        for (const [key, value] of replacements) {
          xml = applyXmlReplacement(xml, key, value)
          xml = applySplitXmlReplacement(xml, key, value)
        }
        zip.file(partName, xml)
      }
      outputBuffer = zip.generate({ type: 'nodebuffer' })
    }

    // Replace marker with a real Word table so template only needs {{material_list}}.
    try {
      const zip = new PizZip(outputBuffer)
      const xmlParts = Object.keys(zip.files).filter((name) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(name))
      const materialTableXml = buildMaterialTableXml(materialRows)
      for (const partName of xmlParts) {
        const part = zip.file(partName)
        if (!part) continue
        const xml = part.asText()
        const replaced = injectMaterialTableXml(xml, materialTableXml)
        if (replaced !== xml) {
          zip.file(partName, replaced)
        }
      }
      outputBuffer = zip.generate({ type: 'nodebuffer' })
    } catch {
      // keep outputBuffer as-is when secondary injection fails
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename=\"${encodeURIComponent(downloadName)}\"`)
    return res.end(outputBuffer)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/supplier-contracts/:id', auth, async (req, res) => {
  try {
    const contractId = req.params.id
    // 删除关联的材料
    await run(`DELETE FROM materials WHERE contractId = ?`, [contractId])
    await run(`DELETE FROM supplier_contracts WHERE id = ?`, [contractId])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 归档合同
app.post('/api/supplier-contracts/:id/archive', auth, async (req, res) => {
  try {
    const now = new Date().toISOString()
    await run(`UPDATE supplier_contracts SET isArchived = 1, updatedAt = ? WHERE id = ?`, [now, req.params.id])
    const contract = (await all(`SELECT * FROM supplier_contracts WHERE id = ?`, [req.params.id]))[0]
    res.json(contract)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 审批合同
app.post('/api/supplier-contracts/:id/approve', auth, async (req, res) => {
  try {
    const { approved, comments } = req.body
    const now = new Date().toISOString()
    const status = approved ? 'approved' : 'rejected'
    await run(`UPDATE supplier_contracts SET approvalStatus = ?, updatedAt = ? WHERE id = ?`, [status, now, req.params.id])
    
    const contract = (await all(`SELECT * FROM supplier_contracts WHERE id = ?`, [req.params.id]))[0]
    
    // 发送通知给董事长、总经理和财务主管
    const chairmanUsers = await all(`SELECT * FROM users WHERE role = 'chairman'`)
    const gmUsers = await all(`SELECT * FROM users WHERE role = 'gm'`)
    const financeUsers = await all(`SELECT * FROM users WHERE role = 'finance_manager'`)
    const notificationUsers = [...chairmanUsers, ...gmUsers, ...financeUsers]
    
    const statusText = approved ? '已通过审批' : '审批被拒绝'
    for (const user of notificationUsers) {
      const notificationId = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
      await run(`INSERT INTO notifications (id, userId, title, message, type, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [notificationId, user.id, '合同审批通知', `合同"${contract.contractName}"${statusText}`, 'approval', 0, now])
    }
    
    res.json(contract)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ===== 材料清单 API =====
// 获取项目材料列表
app.get('/api/projects/:projectId/materials', auth, async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM materials WHERE projectId = ? ORDER BY type ASC, createdAt DESC`, [req.params.projectId])
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 添加材料
app.post('/api/projects/:projectId/materials', auth, async (req, res) => {
  try {
    const id = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
    const now = new Date().toISOString()
    const { serialNumber, name, specification, unit, quantity, unitPrice, totalPrice, remarks, supplier, type } = req.body
    
    await run(`INSERT INTO materials (id, projectId, serialNumber, name, specification, unit, quantity, unitPrice, totalPrice, remarks, supplier, type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.projectId, serialNumber, name, specification, unit, Number(quantity) || 0, Number(unitPrice) || 0, Number(totalPrice) || 0, remarks, supplier, type || '材料清单', now, now])
    
    const material = (await all(`SELECT * FROM materials WHERE id = ?`, [id]))[0]
    res.json(material)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 更新材料
app.put('/api/projects/:projectId/materials/:materialId', auth, async (req, res) => {
  try {
    const { name, specification, unit, quantity, unitPrice, totalPrice, remarks, supplier, type } = req.body
    const now = new Date().toISOString()
    
    await run(`UPDATE materials SET name = ?, specification = ?, unit = ?, quantity = ?, unitPrice = ?, totalPrice = ?, remarks = ?, supplier = ?, type = ?, updatedAt = ? WHERE id = ? AND projectId = ?`,
      [name, specification, unit, Number(quantity) || 0, Number(unitPrice) || 0, Number(totalPrice) || 0, remarks, supplier, type || '材料清单', now, req.params.materialId, req.params.projectId])
    
    const material = (await all(`SELECT * FROM materials WHERE id = ?`, [req.params.materialId]))[0]
    res.json(material)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 删除材料
app.delete('/api/projects/:projectId/materials/:materialId', auth, async (req, res) => {
  try {
    await run(`DELETE FROM materials WHERE id = ? AND projectId = ?`, [req.params.materialId, req.params.projectId])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 批量删除材料
app.post('/api/projects/:projectId/materials/batch-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择要删除的材料' })
    }
    const placeholders = ids.map(() => '?').join(',')
    await run(`DELETE FROM materials WHERE id IN (${placeholders}) AND projectId = ?`, [...ids, req.params.projectId])
    res.json({ ok: true, deleted: ids.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 批量导入材料
app.post('/api/projects/:projectId/materials/import', auth, async (req, res) => {
  try {
    const { rows } = req.body
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: '没有数据可导入' })
    }
    
    const now = new Date().toISOString()
    let imported = 0
    
    for (const row of rows) {
      const id = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
      await run(`INSERT INTO materials (id, projectId, serialNumber, name, specification, unit, quantity, unitPrice, totalPrice, remarks, supplier, type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, req.params.projectId, row.serialNumber, row.name, row.specification, row.unit, Number(row.quantity) || 0, Number(row.unitPrice) || 0, Number(row.totalPrice) || 0, row.remarks, row.supplier, row.type || '材料清单', now, now])
      imported++
    }
    
    res.json({ ok: true, imported })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 导出材料为Excel
const XLSX = require('xlsx')
app.get('/api/projects/:projectId/materials/export-xlsx', auth, async (req, res) => {
  try {
    const materials = await all(`SELECT * FROM materials WHERE projectId = ? ORDER BY type ASC, createdAt ASC`, [req.params.projectId])
    
    // 按类型分组
    const groups = { '材料清单': [], '施工清单': [], '调试清单': [] }
    materials.forEach(m => {
      const t = m.type || '材料清单'
      if (!groups[t]) groups[t] = []
      groups[t].push(m)
    })
    
    const workbook = XLSX.utils.book_new()
    
    for (const [sheetName, items] of Object.entries(groups)) {
      const data = [['序号', '名称', '规格', '单位', '数量', '单价', '总价', '备注', '供应商']]
      items.forEach((m, i) => {
        data.push([i + 1, m.name, m.specification, m.unit, m.quantity, m.unitPrice, m.totalPrice, m.remarks, m.supplier])
      })
      const worksheet = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    }
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=materials.xlsx')
    res.send(buffer)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 材料搜索（跨项目）
app.get('/api/materials/search', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    if (!q) return res.json([])
    
    const rows = await all(`SELECT DISTINCT name, specification, unit, unitPrice, supplier FROM materials WHERE name LIKE ? LIMIT 20`, [`%${q}%`])
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 材料分类
app.get('/api/projects/:projectId/material-categories', auth, async (req, res) => {
  try {
    const rows = await all(`SELECT DISTINCT type FROM materials WHERE projectId = ?`, [req.params.projectId])
    res.json(rows.map(r => r.type))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/projects/:projectId/material-categories', auth, async (req, res) => {
  try {
    const { name } = req.body
    res.json({ ok: true, name })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})


// ===== 供应商产品 API =====
// 确保供应商产品表存在
;(async () => {
  try {
    await run(`CREATE TABLE IF NOT EXISTS supplier_products (
      id TEXT PRIMARY KEY,
      supplierId TEXT NOT NULL,
      productName TEXT NOT NULL,
      specification TEXT,
      unit TEXT,
      unitPrice REAL DEFAULT 0,
      category TEXT,
      description TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      FOREIGN KEY(supplierId) REFERENCES suppliers(id)
    )`)
    
    await run(`CREATE TABLE IF NOT EXISTS supplier_evaluations (
      id TEXT PRIMARY KEY,
      supplierName TEXT NOT NULL,
      projectId TEXT,
      contractId TEXT,
      rating INTEGER DEFAULT 5,
      qualityScore INTEGER DEFAULT 5,
      deliveryScore INTEGER DEFAULT 5,
      serviceScore INTEGER DEFAULT 5,
      comments TEXT,
      evaluatedBy TEXT,
      evaluatedAt TEXT
    )`)
  } catch (e) {
    console.error('创建供应商产品/评价表失败:', e)
  }
})()

// 获取供应商产品
app.get('/api/suppliers/:supplierId/products', auth, async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM supplier_products WHERE supplierId = ? ORDER BY productName ASC`, [req.params.supplierId])
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 创建供应商产品
app.post('/api/suppliers/:supplierId/products', auth, async (req, res) => {
  try {
    const id = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
    const now = new Date().toISOString()
    const { productName, specification, unit, unitPrice, category, description } = req.body
    
    await run(`INSERT INTO supplier_products (id, supplierId, productName, specification, unit, unitPrice, category, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.supplierId, productName, specification, unit, Number(unitPrice) || 0, category, description, now, now])
    
    const product = (await all(`SELECT * FROM supplier_products WHERE id = ?`, [id]))[0]
    res.json(product)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ===== 合同付款记录 API =====
// 确保付款记录表存在
;(async () => {
  try {
    await run(`CREATE TABLE IF NOT EXISTS contract_payments (
      id TEXT PRIMARY KEY,
      contractId TEXT NOT NULL,
      contractNo TEXT,
      contractName TEXT,
      supplierName TEXT,
      paymentAmount REAL DEFAULT 0,
      paymentDate TEXT,
      paymentMethod TEXT,
      invoiceNo TEXT,
      remarks TEXT,
      createdBy TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      FOREIGN KEY(contractId) REFERENCES supplier_contracts(id)
    )`)
  } catch (e) {
    console.error('创建付款记录表失败:', e)
  }
})()

// 获取合同付款记录
app.get('/api/contracts/:contractId/payments', auth, async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM contract_payments WHERE contractId = ? ORDER BY paymentDate DESC`, [req.params.contractId])
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 创建合同付款记录
app.post('/api/contracts/:contractId/payments', auth, async (req, res) => {
  try {
    const id = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
    const now = new Date().toISOString()
    const { paymentAmount, paymentDate, paymentMethod, invoiceNo, remarks } = req.body
    
    // 获取合同信息
    const contract = (await all(`SELECT * FROM supplier_contracts WHERE id = ?`, [req.params.contractId]))[0]
    if (!contract) {
      return res.status(404).json({ error: '合同不存在' })
    }
    
    await run(`INSERT INTO contract_payments (id, contractId, contractNo, contractName, supplierName, paymentAmount, paymentDate, paymentMethod, invoiceNo, remarks, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.contractId, contract.contractNo, contract.contractName, contract.supplierName, Number(paymentAmount) || 0, paymentDate, paymentMethod, invoiceNo, remarks, req.user?.id, now, now])
    
    // 发送通知给董事长、总经理和财务主管
    const chairmanUsers = await all(`SELECT * FROM users WHERE role = 'chairman'`)
    const gmUsers = await all(`SELECT * FROM users WHERE role = 'gm'`)
    const financeUsers = await all(`SELECT * FROM users WHERE role = 'finance_manager'`)
    
    const notificationUsers = [...chairmanUsers, ...gmUsers, ...financeUsers]
    
    for (const user of notificationUsers) {
      const notificationId = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
      await run(`INSERT INTO notifications (id, userId, title, message, type, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [notificationId, user.id, '合同付款通知', `合同"${contract.contractName}"已付款 ¥${paymentAmount}`, 'payment', 0, now])
    }
    
    const payment = (await all(`SELECT * FROM contract_payments WHERE id = ?`, [id]))[0]
    res.json(payment)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ===== 供应商评价 API =====
// 获取供应商评价
app.get('/api/supplier-evaluations', auth, async (req, res) => {
  try {
    const { supplierName, projectId } = req.query
    let sql = `SELECT * FROM supplier_evaluations WHERE 1=1`
    const params = []
    
    if (supplierName) {
      sql += ` AND supplierName = ?`
      params.push(supplierName)
    }
    
    if (projectId) {
      sql += ` AND projectId = ?`
      params.push(projectId)
    }
    
    sql += ` ORDER BY evaluatedAt DESC`
    const rows = await all(sql, params)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 创建供应商评价
app.post('/api/supplier-evaluations', auth, async (req, res) => {
  try {
    const id = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))
    const now = new Date().toISOString()
    const { supplierName, projectId, contractId, rating, qualityScore, deliveryScore, serviceScore, comments } = req.body
    
    await run(`INSERT INTO supplier_evaluations (id, supplierName, projectId, contractId, rating, qualityScore, deliveryScore, serviceScore, comments, evaluatedBy, evaluatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, supplierName, projectId, contractId, rating || 5, qualityScore || 5, deliveryScore || 5, serviceScore || 5, comments, req.user?.id, now])
    
    const evaluation = (await all(`SELECT * FROM supplier_evaluations WHERE id = ?`, [id]))[0]
    res.json(evaluation)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Serve static frontend files (added for Production)
const distPath = path.join(__dirname, '..', 'build_tmp')
if (fs.existsSync(distPath)) {
  console.log('Serving static files from', distPath)
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return res.status(404).json({ error: 'Not Found' })
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })
}
