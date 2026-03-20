const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'app.db');
const db = new sqlite3.Database(dbPath);

db.all(`SELECT * FROM approval_order ORDER BY sort ASC`, [], (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('Current Approval Order:');
  console.table(rows);
});
