import initSqlJs from 'sql.js'

const DB_KEY = 'fa_sqlite_db'
let dbPromise = null
let dbInstance = null

function toBase64(u8) {
  let binary = ''
  const bytes = new Uint8Array(u8)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function fromBase64(b64) {
  const binary_string = atob(b64)
  const len = binary_string.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary_string.charCodeAt(i)
  return bytes
}

export async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({
        // 使用与依赖版本一致的 CDN 路径，避免 JS/WASM 版本不匹配
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/${file}`
      })
      const saved = localStorage.getItem(DB_KEY)
      const db = saved ? new SQL.Database(fromBase64(saved)) : new SQL.Database()
      ensureSchema(db)
      dbInstance = db
      return db
    })()
  }
  return dbPromise
}

export async function saveDb() {
  const db = await getDb()
  const data = db.export()
  localStorage.setItem(DB_KEY, toBase64(data))
}

export function getDbSync() {
  if (!dbInstance) throw new Error('DB not initialized yet')
  return dbInstance
}

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      role TEXT,
      password TEXT
    );
    CREATE TABLE IF NOT EXISTS approval_order (
      role TEXT PRIMARY KEY,
      sort INTEGER
    );
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      title TEXT,
      amount REAL,
      category TEXT,
      date TEXT,
      createdBy TEXT,
      status TEXT,
      steps TEXT,
      currentStepIndex INTEGER,
      history TEXT
    );
  `)
}

export async function seedIfEmpty(defaultUsers, defaultOrder) {
  const db = await getDb()
  const usersCount = db.exec(`SELECT COUNT(*) as c FROM users`)[0]?.values[0][0] || 0
  if (usersCount === 0) {
    const stmt = db.prepare(`INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)`)
    defaultUsers.forEach(u => { stmt.run([u.id, u.name, u.role, u.password]) })
    stmt.free()
  }
  const orderCount = db.exec(`SELECT COUNT(*) as c FROM approval_order`)[0]?.values[0][0] || 0
  if (orderCount === 0) {
    const stmt = db.prepare(`INSERT INTO approval_order (role, sort) VALUES (?, ?)`)
    defaultOrder.forEach((role, i) => { stmt.run([role, i]) })
    stmt.free()
  }
  await saveDb()
}

export async function getApprovalOrderFromDb() {
  const db = await getDb()
  const res = db.exec(`SELECT role FROM approval_order ORDER BY sort ASC`)
  const rows = res[0]?.values || []
  return rows.map(r => r[0])
}

export async function setApprovalOrderInDb(order) {
  const db = await getDb()
  db.exec(`DELETE FROM approval_order`)
  const stmt = db.prepare(`INSERT INTO approval_order (role, sort) VALUES (?, ?)`)
  order.forEach((role, i) => stmt.run([role, i]))
  stmt.free()
  await saveDb()
}

export async function getUsersFromDb() {
  const db = await getDb()
  const res = db.exec(`SELECT id, name, role, password FROM users`)
  const rows = res[0]?.values || []
  return rows.map(([id, name, role, password]) => ({ id, name, role, password }))
}

export async function setUsersInDb(users) {
  const db = await getDb()
  db.exec(`DELETE FROM users`)
  const stmt = db.prepare(`INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)`)
  users.forEach(u => stmt.run([u.id, u.name, u.role, u.password]))
  stmt.free()
  await saveDb()
}

export async function upsertBill(bill) {
  const db = await getDb()
  const stmt = db.prepare(`REPLACE INTO bills (id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  stmt.run([
    bill.id, bill.title, bill.amount, bill.category, bill.date, bill.createdBy,
    bill.status, JSON.stringify(bill.steps || []), bill.currentStepIndex ?? 0, JSON.stringify(bill.history || [])
  ])
  stmt.free()
  await saveDb()
}

export async function getBillsFromDb() {
  const db = await getDb()
  const res = db.exec(`SELECT id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history FROM bills ORDER BY date DESC, id DESC`)
  const rows = res[0]?.values || []
  return rows.map(([id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history]) => ({
    id, title, amount, category, date, createdBy, status,
    steps: steps ? JSON.parse(steps) : [],
    currentStepIndex: currentStepIndex ?? 0,
    history: history ? JSON.parse(history) : []
  }))
}

export async function getBillFromDb(id) {
  const db = await getDb()
  const res = db.exec(`SELECT id, title, amount, category, date, createdBy, status, steps, currentStepIndex, history FROM bills WHERE id = '${id}' LIMIT 1`)
  const rows = res[0]?.values || []
  if (rows.length === 0) return null
  const [bid, title, amount, category, date, createdBy, status, steps, currentStepIndex, history] = rows[0]
  return {
    id: bid, title, amount, category, date, createdBy, status,
    steps: steps ? JSON.parse(steps) : [],
    currentStepIndex: currentStepIndex ?? 0,
    history: history ? JSON.parse(history) : []
  }
}