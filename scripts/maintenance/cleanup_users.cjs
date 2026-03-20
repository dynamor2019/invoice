// 清理多余用户，只保留5个普通用户
const sqlite3 = require('sqlite3').verbose();

async function cleanupUsers() {
  console.log('🧹 开始清理多余用户...\n');
  
  const db = new sqlite3.Database('./server/data/app.db');
  
  // 删除user06到user15的用户
  const usersToDelete = ['user06', 'user07', 'user08', 'user09', 'user10', 
                        'user11', 'user12', 'user13', 'user14', 'user15'];
  
  console.log('🗑️ 准备删除的用户:', usersToDelete);
  
  for (const userId of usersToDelete) {
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) {
          console.error(`❌ 删除用户 ${userId} 失败:`, err);
          reject(err);
        } else {
          console.log(`✅ 已删除用户: ${userId}`);
          resolve();
        }
      });
    });
  }
  
  // 检查剩余用户
  db.all('SELECT id, name, role FROM users ORDER BY id', (err, rows) => {
    if (err) {
      console.error('❌ 查询用户失败:', err);
    } else {
      console.log('\n📊 清理后的用户列表:');
      console.table(rows);
      
      const staffUsers = rows.filter(u => u.role === 'staff');
      console.log(`\n✅ 普通用户数量: ${staffUsers.length}/5`);
      console.log('🎯 用户清理完成！');
    }
    db.close();
  });
}

cleanupUsers().catch(console.error);