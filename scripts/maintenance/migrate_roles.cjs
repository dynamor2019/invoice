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
    console.log('Migrating approval roles...');

    // 1. Update Approval Order
    // Goal: approver1 -> manager -> gm
    console.log('Updating approval_order...');
    await run('DELETE FROM approval_order');
    await run("INSERT INTO approval_order (role, sort) VALUES ('approver1', 0)");
    await run("INSERT INTO approval_order (role, sort) VALUES ('manager', 1)");
    await run("INSERT INTO approval_order (role, sort) VALUES ('gm', 2)");
    console.log('Approval order updated: approver1 -> manager -> gm');

    // 2. Update Users
    console.log('Updating users...');
    
    // Remove redundant approver users
    await run("DELETE FROM users WHERE role IN ('approver2', 'approver3')");
    console.log('Deleted approver2, approver3 users.');

    // Ensure Manager (Li Changchun) exists
    // We try to update existing mgr1 or insert if not exists
    const mgr = await all("SELECT id FROM users WHERE role = 'manager' LIMIT 1");
    if (mgr.length > 0) {
      await run("UPDATE users SET name = '李长春' WHERE id = ?", [mgr[0].id]);
      console.log(`Updated existing manager ${mgr[0].id} to 李长春`);
    } else {
      await run("INSERT INTO users (id, name, role, password) VALUES ('mgr1', '李长春', 'manager', '123456')");
      console.log("Created manager mgr1 (李长春)");
    }

    // Ensure GM (Li Zong) exists
    const gm = await all("SELECT id FROM users WHERE role = 'gm' LIMIT 1");
    if (gm.length > 0) {
      await run("UPDATE users SET name = '李总' WHERE id = ?", [gm[0].id]);
      console.log(`Updated existing gm ${gm[0].id} to 李总`);
    } else {
      await run("INSERT INTO users (id, name, role, password) VALUES ('gm1', '李总', 'gm', '123456')");
      console.log("Created gm gm1 (李总)");
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    db.close();
  }
}

main();
