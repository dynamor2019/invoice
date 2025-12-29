const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'server', 'data', 'app.db');
const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function main() {
  try {
    console.log('Checking users...');
    const users = [
      { id: 'gm1', name: '总经理', role: 'gm', password: '123456' },
      { id: 'mgr1', name: '经理', role: 'manager', password: '123456' },
      { id: 'pm1', name: '项目经理1', role: 'project_manager', password: '123456' },
      { id: 'pm2', name: '项目经理2', role: 'project_manager', password: '123456' },
      { id: 'pm3', name: '项目经理3', role: 'project_manager', password: '123456' },
      { id: 'cost1', name: '造价员1', role: 'cost', password: '123456' },
      { id: 'proc1', name: '采购员1', role: 'procurement', password: '123456' },
    ];

    for (const u of users) {
      const existing = await all('SELECT id FROM users WHERE id = ?', [u.id]);
      if (existing.length === 0) {
        console.log(`Adding user ${u.id}...`);
        await run('INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)', [u.id, u.name, u.role, u.password]);
      } else {
        console.log(`User ${u.id} already exists.`);
      }
    }

    console.log('Checking approval order...');
    const order = await all('SELECT * FROM approval_order ORDER BY sort ASC');
    console.log('Current order:', order.map(o => o.role));

    // Check if project_manager is in the order and remove it if present
    const hasPM = order.some(o => o.role === 'project_manager');
    if (hasPM) {
      console.log('Removing project_manager from approval order...');
      await run('DELETE FROM approval_order WHERE role = ?', ['project_manager']);
      console.log('Removed project_manager from approval order.');
    } else {
      console.log('project_manager is not in approval order (correct).');
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    db.close();
  }
}

main();
