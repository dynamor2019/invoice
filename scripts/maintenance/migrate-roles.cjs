const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'app.db');
const db = new sqlite3.Database(dbPath);

async function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

async function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function migrate() {
  try {
    console.log('Starting migration...');

    // 1. Update Approval Order
    console.log('Updating approval_order...');
    await run(`DELETE FROM approval_order`);
    const newOrder = ['gm', 'vice_chairman', 'chairman']; // Ordered roles
    for (let i = 0; i < newOrder.length; i++) {
      await run(`INSERT INTO approval_order (role, sort) VALUES (?, ?)`, [newOrder[i], i]);
    }
    console.log('Approval order updated.');

    // 2. Migrate Pending Bills
    console.log('Migrating pending bills...');
    const bills = await all(`SELECT id, steps, currentStepIndex FROM bills WHERE status = 'pending'`);
    
    let count = 0;
    for (const b of bills) {
      let steps = [];
      try {
        steps = JSON.parse(b.steps);
      } catch {
        continue;
      }

      if (!Array.isArray(steps)) continue;

      // Mapping: approver1 -> gm, approver2 -> vice_chairman, approver3 -> chairman
      let changed = false;
      const newSteps = steps.map(s => {
        if (s === 'approver1') { changed = true; return 'gm'; }
        if (s === 'approver2') { changed = true; return 'vice_chairman'; }
        if (s === 'approver3') { changed = true; return 'chairman'; }
        return s;
      });

      if (changed) {
        await run(`UPDATE bills SET steps = ? WHERE id = ?`, [JSON.stringify(newSteps), b.id]);
        count++;
        console.log(`Migrated bill ${b.id}: ${JSON.stringify(steps)} -> ${JSON.stringify(newSteps)}`);
      }
    }
    console.log(`Migrated ${count} bills.`);
    
    // 3. Update Approval Thresholds Settings if exists
    console.log('Updating approval thresholds...');
    const settings = await all(`SELECT value FROM settings WHERE key = 'approvalThresholds'`);
    if (settings.length > 0) {
      try {
        const v = JSON.parse(settings[0].value);
        const newV = {};
        if (v.approver1) newV.gm = v.approver1;
        if (v.approver2) newV.vice_chairman = v.approver2;
        if (v.approver3) newV.chairman = v.approver3;
        // Keep existing if they are already correct
        Object.assign(newV, v);
        // Remove old keys if new ones exist
        if (newV.gm) delete newV.approver1;
        if (newV.vice_chairman) delete newV.approver2;
        if (newV.chairman) delete newV.approver3;
        
        await run(`UPDATE settings SET value = ? WHERE key = 'approvalThresholds'`, [JSON.stringify(newV)]);
        console.log('Thresholds updated:', newV);
      } catch (e) {
        console.warn('Failed to update thresholds:', e);
      }
    }

  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    db.close();
  }
}

migrate();
