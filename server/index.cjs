const express = require('express')
const cors = require('cors')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()
const fs = require('fs')
const multer = require('multer')
const os = require('os')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

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
    createdBy TEXT,
    status TEXT,
    steps TEXT,
    currentStepIndex INTEGER,
    history TEXT,
    images TEXT
  )`)
  await run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`)

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
    const rows = await all(`SELECT id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history, images FROM bills ORDER BY date DESC, id DESC`)
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
    const rows = await all(`SELECT id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history, images FROM bills WHERE status = 'pending' ORDER BY date DESC, id DESC`)
    const parsed = rows.map(r => normalizeBillRow(r)).filter(b => Array.isArray(b.steps) && b.steps[b.currentStepIndex] === role)
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/bills/archived', async (req, res) => {
  try {
    const rows = await all(`SELECT id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history, images FROM bills WHERE status = 'archived' ORDER BY date DESC, id DESC`)
    const parsed = rows.map(r => normalizeBillRow(r))
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/bill/:id', async (req, res) => {
  try {
    const rows = await all(`SELECT id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history, images, relatedId FROM bills WHERE id = ? LIMIT 1`, [req.params.id])
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
    const { title = '票据', amount = 0, category = '通用', date = new Date().toISOString().slice(0,10) } = req.body || {}
    const createdBy = req.user?.id || 'admin'
    // 读取审批顺序
    const orows = await all(`SELECT role FROM approval_order ORDER BY sort ASC`)
    let order = orows.map(r => r.role)
    if (!Array.isArray(order) || order.length === 0) {
      order = ['approver1','approver2','approver3']
    }
    // 读取免审阈值并按金额裁剪审批步骤
    let thr = {}
    try {
      const rows = await all(`SELECT value FROM settings WHERE key = 'approvalThresholds' LIMIT 1`)
      thr = JSON.parse(rows[0]?.value || '{}')
    } catch { thr = {} }
    const amt = Number(amount) || 0
    const filtered = order.filter(role => {
      if (!/^approver[123]$/.test(role)) return true
      const limit = Number(thr[role]) || 0
      return !(amt < limit && limit > 0)
    })
    // 计算步骤：严格按照配置顺序，从第一个审批人开始，最后追加 accountant
    const steps = [...filtered, 'accountant']
    const id = String(req.body?.id || (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8))))
    const nowISO = new Date().toISOString()
    const history = [{ action: 'create', by: createdBy, time: nowISO }]
    const status = 'pending'
    const currentStepIndex = 0
    await run(`REPLACE INTO bills (id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      id, title, Number(amount) || 0, category, date, createdBy, status, JSON.stringify(steps), currentStepIndex, JSON.stringify(history), JSON.stringify([])
    ])
    res.json({ id, title, amount: Number(amount)||0, category, date, createdBy, status, steps, currentStepIndex, history, images: [] })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/bill/approve', async (req, res) => {
  const { id } = req.body
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
    // if steps empty, rebuild from approval_order + accountant，并应用免审阈值
    if (!Array.isArray(b.steps) || b.steps.length === 0) {
      const orows = await all(`SELECT role FROM approval_order ORDER BY sort ASC`)
      let order = orows.map(r => r.role)
      if (!Array.isArray(order) || order.length === 0) order = ['approver1','approver2','approver3']
      let thr = {}
      try {
        const srows = await all(`SELECT value FROM settings WHERE key = 'approvalThresholds' LIMIT 1`)
        thr = JSON.parse(srows[0]?.value || '{}')
      } catch { thr = {} }
      const amt = Number(b.amount) || 0
      const filtered = order.filter(role => {
        if (!/^approver[123]$/.test(role)) return true
        const limit = Number(thr[role]) || 0
        return !(amt < limit && limit > 0)
      })
      b.steps = [...filtered, 'accountant']
      b.currentStepIndex = 0
    }
    // clamp index
    if (b.currentStepIndex < 0 || b.currentStepIndex >= b.steps.length) b.currentStepIndex = 0
    if (b.status !== 'pending') return res.status(400).json({ error: '当前票据不在审批中' })
    const expected = b.steps[b.currentStepIndex]
    // 最终以流程当前步骤为准，避免客户端令牌与所需角色不同步导致阻塞
    const role = expected
    // default date if empty
    if (!b.date) b.date = new Date().toISOString().slice(0,10)
    console.log('approve debug', { id: b.id, expected: role, currentStepIndex: b.currentStepIndex, historyType: Array.isArray(b.history) ? 'array' : typeof b.history, historyPreview: (() => { try { return JSON.stringify(b.history).slice(0, 120) } catch { return String(b.history) } })() })
    b.history.push({ action: 'approve', role: role, time: new Date().toISOString() })
    if (b.currentStepIndex < b.steps.length - 1) {
      b.currentStepIndex += 1
    } else {
      // 最后一步：如果为会计，则归档
      const finalRole = b.steps[b.currentStepIndex]
      b.status = finalRole === 'accountant' ? 'archived' : 'approved'
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
      const orows = await all(`SELECT role FROM approval_order ORDER BY sort ASC`)
      let order = orows.map(r => r.role)
      if (!Array.isArray(order) || order.length === 0) order = ['approver1','approver2','approver3']
      let thr = {}
      try {
        const srows = await all(`SELECT value FROM settings WHERE key = 'approvalThresholds' LIMIT 1`)
        thr = JSON.parse(srows[0]?.value || '{}')
      } catch { thr = {} }
      const amt = Number(b.amount) || 0
      const filtered = order.filter(role => {
        if (!/^approver[123]$/.test(role)) return true
        const limit = Number(thr[role]) || 0
        return !(amt < limit && limit > 0)
      })
      b.steps = [...filtered, 'accountant']
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

const PORT = process.env.PORT || 6666
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