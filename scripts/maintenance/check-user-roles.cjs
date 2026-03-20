const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'app.db');
const db = new sqlite3.Database(dbPath);

db.all(`SELECT id, name, role FROM users WHERE id IN ('approver1', 'approver2', 'approver3')`, [], (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  console.table(rows);
});
