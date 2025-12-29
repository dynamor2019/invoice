# 采购合同管理功能实现

## 🎯 新增功能

### 1. 合同编辑功能 ✅
- **权限控制**: 只有采购经理和管理员可以编辑
- **状态限制**: 只能编辑草稿状态的合同
- **编辑界面**: 复用合同创建表单，支持修改所有字段
- **材料清单**: 编辑时保留原有材料清单

### 2. 合同删除功能 ✅
- **权限控制**: 只有采购经理和管理员可以删除
- **状态限制**: 只能删除草稿状态的合同
- **安全确认**: 删除前需要用户确认
- **数据清理**: 完全从数据库中删除合同记录

### 3. 合同归档功能 ✅
- **权限控制**: 只有采购经理和管理员可以归档
- **状态限制**: 只能归档已审批（通过/拒绝）的合同
- **状态更新**: 将合同状态设置为 `archived`
- **列表过滤**: 默认不显示已归档合同

### 4. 归档合同查看 ✅
- **切换开关**: 在合同管理界面添加"显示已归档合同"复选框
- **动态加载**: 切换时自动重新加载合同列表
- **状态标识**: 归档合同显示紫色"已归档"标签

## 🔧 技术实现

### 前端实现 (src/pages/Projects.jsx)

#### 状态管理
```javascript
const [showArchivedContracts, setShowArchivedContracts] = useState(false)
```

#### 操作函数
```javascript
// 删除合同
const handleDeleteContract = async (contractId) => {
  if (!confirm('确定要删除这个合同吗？此操作不可撤销。')) return
  
  const res = await fetch(`${API_BASE}/supplier-contracts/${contractId}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
  
  if (!res.ok) throw new Error('删除失败')
  await loadProjectContracts(currentProjectId)
  alert('合同已删除')
}

// 归档合同
const handleArchiveContract = async (contractId) => {
  if (!confirm('确定要归档这个合同吗？')) return
  
  const res = await fetch(`${API_BASE}/supplier-contracts/${contractId}/archive`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' })
  })
  
  if (!res.ok) throw new Error('归档失败')
  await loadProjectContracts(currentProjectId)
  alert('合同已归档')
}
```

#### 界面更新
```jsx
{/* 操作按钮 */}
<div className="flex gap-2 flex-wrap">
  {/* 编辑按钮 - 草稿状态 */}
  {['procurement_manager', 'admin'].includes(user?.role) && contract.status === 'draft' && (
    <button onClick={() => editContract(contract)}>编辑</button>
  )}
  
  {/* 删除按钮 - 草稿状态 */}
  {['procurement_manager', 'admin'].includes(user?.role) && contract.status === 'draft' && (
    <button onClick={() => handleDeleteContract(contract.id)}>删除</button>
  )}
  
  {/* 归档按钮 - 已审批状态 */}
  {['procurement_manager', 'admin'].includes(user?.role) && 
   ['approved', 'rejected'].includes(contract.status) && (
    <button onClick={() => handleArchiveContract(contract.id)}>归档</button>
  )}
  
  {/* 审批按钮 - 待审批状态 */}
  {['chairman', 'gm', 'admin'].includes(user?.role) && 
   (contract.status === 'draft' || contract.status === 'pending') && (
    <>
      <button onClick={() => approveContract(contract.id, true)}>通过</button>
      <button onClick={() => approveContract(contract.id, false)}>拒绝</button>
    </>
  )}
</div>

{/* 归档切换开关 */}
<label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    checked={showArchivedContracts}
    onChange={e => setShowArchivedContracts(e.target.checked)}
  />
  <span>显示已归档合同</span>
</label>
```

### 后端实现 (server/index.cjs)

#### 删除合同API
```javascript
app.delete('/api/supplier-contracts/:id', auth, async (req, res) => {
  const role = String(req.user?.role || '')
  
  if (!['procurement_manager', 'admin'].includes(role)) {
    return res.status(403).json({ error: '无权限' })
  }
  
  const contractId = req.params.id
  
  // 检查合同状态
  const contract = await all(`SELECT status, approvalStatus FROM supplier_contracts WHERE id = ?`, [contractId])
  if (contract[0].status !== 'draft' && contract[0].approvalStatus !== 'draft') {
    return res.status(400).json({ error: '只能删除草稿状态的合同' })
  }
  
  await run(`DELETE FROM supplier_contracts WHERE id = ?`, [contractId])
  await logAudit(req.user.id, 'delete', 'supplier_contract', contractId, {})
  
  res.json({ ok: true })
})
```

#### 归档合同API
```javascript
app.post('/api/supplier-contracts/:id/archive', auth, async (req, res) => {
  const role = String(req.user?.role || '')
  
  if (!['procurement_manager', 'admin'].includes(role)) {
    return res.status(403).json({ error: '无权限' })
  }
  
  const contractId = req.params.id
  
  // 检查合同状态
  const contract = await all(`SELECT approvalStatus FROM supplier_contracts WHERE id = ?`, [contractId])
  if (!['approved', 'rejected'].includes(contract[0].approvalStatus)) {
    return res.status(400).json({ error: '只能归档已审批的合同' })
  }
  
  await run(`UPDATE supplier_contracts SET status = 'archived' WHERE id = ?`, [contractId])
  await logAudit(req.user.id, 'archive', 'supplier_contract', contractId, {})
  
  res.json({ ok: true })
})
```

#### 合同列表API更新
```javascript
app.get('/api/supplier-contracts', auth, async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true'
  
  let conditions = []
  
  // 默认不显示已归档的合同
  if (!includeArchived) {
    conditions.push(`status != 'archived'`)
  }
  
  // 构建SQL查询...
})
```

## 📊 合同状态流程

```
草稿 (draft) 
  ↓ [可编辑、可删除]
待审批 (pending)
  ↓ [可审批]
已通过 (approved) / 已拒绝 (rejected)
  ↓ [可归档]
已归档 (archived)
```

## 🎨 用户界面

### 操作按钮权限矩阵

| 状态 | 编辑 | 删除 | 归档 | 审批 |
|------|------|------|------|------|
| 草稿 | ✅ | ✅ | ❌ | ✅ |
| 待审批 | ❌ | ❌ | ❌ | ✅ |
| 已通过 | ❌ | ❌ | ✅ | ❌ |
| 已拒绝 | ❌ | ❌ | ✅ | ❌ |
| 已归档 | ❌ | ❌ | ❌ | ❌ |

### 角色权限

- **采购经理 (procurement_manager)**: 编辑、删除、归档
- **管理员 (admin)**: 编辑、删除、归档、审批
- **董事长 (chairman)**: 审批
- **总经理 (gm)**: 审批

## 🔒 安全特性

1. **权限验证**: 每个操作都有严格的角色权限检查
2. **状态验证**: 只能在合适的状态下执行相应操作
3. **用户确认**: 删除和归档操作需要用户确认
4. **审计日志**: 所有操作都记录在审计日志中
5. **数据完整性**: 删除前检查合同状态，归档前检查审批状态

## 🎯 用户体验

1. **直观操作**: 按钮根据合同状态和用户权限动态显示
2. **状态标识**: 不同状态用不同颜色标签区分
3. **归档管理**: 可选择性查看归档合同，保持界面整洁
4. **操作反馈**: 每个操作都有明确的成功/失败提示
5. **安全确认**: 重要操作需要用户二次确认

现在采购合同具备了完整的生命周期管理功能，从创建、编辑、审批到归档的全流程管理。