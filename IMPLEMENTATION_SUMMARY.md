# 编号格式更新和合同材料联动功能实现总结

## 🎯 实现的功能

### 1. 项目编号格式更新
- **旧格式**: `HN-年-月-序号` (如：HN-2025-12-01)
- **新格式**: `HN-年-月-日-序号` (如：HN-2025-12-26-001)
- **序号位数**: 从2位扩展到3位，支持每天最多999个项目

### 2. 合同编号自动生成
- **格式**: `HN-CG-年-月-日-序号` (如：HN-CG-2025-12-26-001)
- **自动生成**: 创建合同时系统自动生成，无需手动输入
- **序号管理**: 按天递增，支持每天最多999个合同

### 3. 合同材料清单联动
- **材料类别选择**: 材料清单、施工清单、调试清单
- **智能同步**: 合同中添加的材料自动同步到项目对应的材料清单
- **供应商关联**: 材料自动关联到选择的供应商
- **可视化界面**: 材料分类统计和颜色标识

## 🔧 技术实现

### 后端修改 (server/index.cjs)

#### 项目编号生成
```javascript
// 自动生成项目编号 HN-year-month-date-000
const now = new Date()
const year = now.getFullYear()
const month = String(now.getMonth() + 1).padStart(2, '0')
const date = String(now.getDate()).padStart(2, '0')
const prefix = `HN-${year}-${month}-${date}-`

// 查找当天最大的序号
const existingCodes = await all(`SELECT code FROM projects WHERE code LIKE ? ORDER BY code DESC`, [`${prefix}%`])
let nextNumber = 1

if (existingCodes.length > 0) {
  const lastCode = existingCodes[0].code
  const lastNumber = parseInt(lastCode.split('-').pop()) || 0
  nextNumber = lastNumber + 1
}

const code = prefix + String(nextNumber).padStart(3, '0')
```

#### 合同编号生成
```javascript
// 自动生成合同编号 HN-CG-year-month-date-000
const contractPrefix = `HN-CG-${year}-${month}-${date}-`
const existingContractCodes = await all(`SELECT contractNo FROM supplier_contracts WHERE contractNo LIKE ? ORDER BY contractNo DESC`, [`${contractPrefix}%`])
let nextContractNumber = 1

if (existingContractCodes.length > 0) {
  const lastContractCode = existingContractCodes[0].contractNo
  const lastNumber = parseInt(lastContractCode.split('-').pop()) || 0
  nextContractNumber = lastNumber + 1
}

const autoContractNo = contractPrefix + String(nextContractNumber).padStart(3, '0')
```

#### 数据迁移API
- `POST /api/projects/migrate-codes` - 迁移项目编号
- `POST /api/supplier-contracts/migrate-codes` - 迁移合同编号

### 前端修改 (src/pages/Projects.jsx)

#### ContractForm组件增强
1. **材料类别选择**
   ```jsx
   <select
     className="input text-sm mt-1"
     value={newMaterial.category}
     onChange={e => setNewMaterial({...newMaterial, category: e.target.value})}
   >
     <option value="材料清单">材料清单</option>
     <option value="施工清单">施工清单</option>
     <option value="调试清单">调试清单</option>
   </select>
   ```

2. **材料同步功能**
   ```javascript
   const addMaterialToContract = async () => {
     // 添加到合同材料清单
     setMaterialList(prev => [...prev, material])

     // 同步添加到项目材料清单
     await addMaterial(formData.projectId, {
       name: String(material.name || ''),
       specification: String(material.specification || ''),
       unit: String(material.unit || ''),
       quantity: Number(material.quantity || 0),
       unitPrice: Number(material.unitPrice || 0),
       totalPrice: Number(material.totalPrice || 0),
       remarks: String(material.remarks || ''),
       supplier: formData.supplierName || '',
       type: material.category // 使用选择的材料类别
     })
   }
   ```

3. **合同编号字段**
   ```jsx
   <input 
     className="input w-full mt-1 bg-gray-100" 
     value={formData.contractNo || ''} 
     disabled
     placeholder="系统自动生成"
   />
   <p className="text-xs text-gray-500 mt-1">合同编号由系统自动生成，格式：HN-CG-年-月-日-序号</p>
   ```

### 管理界面更新 (src/pages/Admin.jsx)

#### 迁移功能界面
```jsx
<section className="mb-6 admin-section">
  <h3 className="section-title mb-2">编号格式迁移</h3>
  <div className="space-y-4">
    <div className="bg-blue-50 rounded-lg p-4">
      <h4 className="font-medium text-blue-800 mb-2">项目编号迁移</h4>
      <p className="section-desc mb-3 text-blue-700">将现有项目编号更新为新格式：HN-年-月-日-序号</p>
      <button onClick={onMigrateProjectCodes} className="btn btn-primary btn-sm">
        迁移项目编号
      </button>
    </div>
    
    <div className="bg-green-50 rounded-lg p-4">
      <h4 className="font-medium text-green-800 mb-2">合同编号迁移</h4>
      <p className="section-desc mb-3 text-green-700">将现有合同编号更新为新格式：HN-CG-年-月-日-序号</p>
      <button onClick={onMigrateContractCodes} className="btn btn-primary btn-sm">
        迁移合同编号
      </button>
    </div>
  </div>
</section>
```

## 📊 数据库变更

### 新增表结构
```sql
-- 供应商合同表
CREATE TABLE IF NOT EXISTS supplier_contracts (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  contractNo TEXT NOT NULL,
  contractName TEXT NOT NULL,
  supplierId TEXT,
  supplierName TEXT NOT NULL,
  contractAmountEnc TEXT NOT NULL,
  paymentMethod TEXT,
  materialList TEXT,
  contractFileUrl TEXT,
  status TEXT DEFAULT 'draft',
  approvalStatus TEXT DEFAULT 'pending',
  createdBy TEXT NOT NULL,
  createdAt TEXT,
  updatedAt TEXT,
  FOREIGN KEY(projectId) REFERENCES projects(id)
);

-- 供应商表
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contactPerson TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  taxNumber TEXT,
  bankAccount TEXT,
  status TEXT DEFAULT 'active',
  createdAt TEXT,
  updatedAt TEXT
);
```

### 数据迁移结果
- **项目编号**: 3个项目已迁移到新格式
  - `HN-2025-11-01` → `HN-2025-11-26-001`
  - `HN-2025-12-01` → `HN-2025-12-11-001`
  - `HN-2025-12-02` → `HN-2025-12-19-001`

## 🎨 用户界面改进

### 1. 合同表单界面
- **三层表单布局**: 类别选择 → 材料信息 → 备注
- **实时计算**: 自动计算材料总价
- **分类统计**: 显示各类别材料数量和金额
- **颜色标识**: 不同类别用不同颜色区分

### 2. 材料清单表格
- **类别列**: 显示材料所属清单类别
- **颜色标签**: 材料清单(蓝色)、施工清单(绿色)、调试清单(紫色)
- **统计信息**: 实时显示各类别汇总

### 3. 智能提示
- **同步提示**: "智能同步: 添加的材料将自动同步到项目对应的材料清单中"
- **格式说明**: 显示编号生成规则和格式

## 🔄 工作流程

### 合同创建流程
1. **选择项目** → 自动填充项目信息
2. **选择供应商** → 自动填充供应商信息
3. **添加材料** → 选择类别 → 填写材料信息 → 自动同步到项目
4. **提交合同** → 系统自动生成合同编号

### 材料同步流程
```
合同材料录入 → 选择类别 → 添加到合同清单 → 自动同步到项目材料清单
                    ↓
              供应商信息自动关联
```

## 📁 文件清单

### 修改的文件
- `server/index.cjs` - 后端API和数据库逻辑
- `src/pages/Projects.jsx` - 项目管理和合同表单
- `src/pages/Admin.jsx` - 管理界面

### 新增的文件
- `migrate_codes.cjs` - 数据迁移脚本
- `CONTRACT_MATERIAL_INTEGRATION.md` - 功能文档
- `IMPLEMENTATION_SUMMARY.md` - 实现总结

## ✅ 测试验证

### 功能测试
- [x] 项目编号自动生成 (新格式)
- [x] 合同编号自动生成 (新格式)
- [x] 材料类别选择功能
- [x] 材料同步到项目清单
- [x] 供应商信息关联
- [x] 数据迁移功能
- [x] 管理界面迁移按钮

### 数据验证
- [x] 现有项目编号已迁移
- [x] 数据库表结构正确
- [x] 示例供应商数据已添加
- [x] 前后端API正常工作

## 🚀 部署说明

1. **数据库迁移**: 运行 `node migrate_codes.cjs` 更新现有数据
2. **服务重启**: 重启后端服务以应用新的API
3. **前端更新**: 前端代码已自动热更新

## 📝 使用说明

### 管理员操作
1. 登录管理界面
2. 进入"编号格式迁移"部分
3. 点击相应按钮执行迁移

### 用户操作
1. 创建采购合同时，合同编号自动生成
2. 添加材料时，选择对应的清单类别
3. 材料会自动同步到项目的对应清单中

这个实现完全满足了用户的需求，提供了完整的编号管理和材料联动功能。