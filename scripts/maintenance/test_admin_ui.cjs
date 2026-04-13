// 测试admin用户UI和数据库同步
const sqlite3 = require('sqlite3').verbose();

async function testAdminUI() {
  console.log('🔍 测试Admin用户UI和数据库同步...\n');
  
  // 1. 检查数据库连接
  const db = new sqlite3.Database('./server/data/app.db');
  
  console.log('📊 数据库用户信息:');
  db.all('SELECT id, name, role FROM users ORDER BY id', (err, users) => {
    if (err) {
      console.error('❌ 数据库连接失败:', err);
      return;
    }
    
    console.table(users);
    
    // 2. 检查admin用户
    const admin = users.find(u => u.role === 'admin');
    if (admin) {
      console.log('✅ Admin用户存在:', admin);
    } else {
      console.log('❌ Admin用户不存在');
    }
    
    // 3. 检查新角色用户
    const newRoles = ['chairman', 'vice_chairman', 'gm', 'project_manager', 'procurement_manager', 'cost_manager', 'finance_manager'];
    console.log('\n🆕 新角色用户检查:');
    newRoles.forEach(role => {
      const user = users.find(u => u.role === role);
      if (user) {
        console.log(`✅ ${role}: ${user.name} (${user.id})`);
      } else {
        console.log(`❌ ${role}: 未找到`);
      }
    });
    
    // 4. 统计用户角色分布
    console.log('\n📈 用户角色分布:');
    const roleCount = {};
    users.forEach(u => {
      roleCount[u.role] = (roleCount[u.role] || 0) + 1;
    });
    console.table(roleCount);
    
    console.log('\n✅ 数据库同步检查完成');
    console.log('💡 Admin用户可以通过 http://localhost:5173/admin 访问管理界面');
    console.log('🔑 Admin登录信息: 用户名=admin, 密码=admin123');
    
    db.close();
  });
}

testAdminUI();