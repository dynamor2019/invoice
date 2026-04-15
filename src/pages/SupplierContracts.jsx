import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../store/users'
import {
  deleteSupplierContract,
  listSupplierContracts,
  updateSupplierContract,
} from '../store/projects'

export default function SupplierContracts() {
  const INPUT_HISTORY_STORAGE_KEY = 'supplier_contract_form_input_history_v1'
  const INPUT_HISTORY_FIELDS = [
    'contractNo',
    'contractName',
    'supplierName',
    'contractAmount',
    'paymentMethod',
    'materialList',
    'warrantyPeriod',
    'deliveryLocation',
    'qualityStandard',
  ]
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [contracts, setContracts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingContract, setEditingContract] = useState(null)
  const [inputHistory, setInputHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(INPUT_HISTORY_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : {}
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  })
  const [formData, setFormData] = useState({
    projectId: '',
    contractNo: '',
    contractName: '',
    supplierName: '',
    contractAmount: '',
    paymentMethod: '',
    materialList: '',
    signDate: '',
    startDate: '',
    endDate: '',
    warrantyPeriod: '',
    deliveryLocation: '',
    qualityStandard: '',
    status: 'draft'
  })

  // 权限检查
  const canManage = user?.role === 'procurement_manager' || user?.role === 'admin'

  useEffect(() => {
    loadContracts()
  }, [])

  const persistInputHistory = (nextHistory) => {
    setInputHistory(nextHistory)
    try {
      localStorage.setItem(INPUT_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory))
    } catch {
      // ignore localStorage quota errors
    }
  }

  const rememberInputValue = (field, value) => {
    if (!INPUT_HISTORY_FIELDS.includes(field)) return
    const normalized = String(value || '').trim()
    if (!normalized) return
    const previous = Array.isArray(inputHistory[field]) ? inputHistory[field] : []
    const nextValues = [normalized, ...previous.filter((item) => item !== normalized)].slice(0, 8)
    persistInputHistory({ ...inputHistory, [field]: nextValues })
  }

  const loadContracts = async () => {
    try {
      const data = await listSupplierContracts({ includeArchived: true })
      const normalized = (Array.isArray(data) ? data : []).map((item) => {
        const materialRows = Array.isArray(item.materialList) ? item.materialList : []
        const materialText = materialRows
          .map((m) => [m?.name, m?.specification, m?.unit, m?.quantity].filter(Boolean).join(' '))
          .filter(Boolean)
          .join('\n')
        return {
          ...item,
          materialList: materialText,
        }
      })
      setContracts(normalized)
    } catch (e) {
      console.error('load supplier contracts failed:', e)
      setContracts([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.contractName.trim() || !formData.supplierName.trim()) {
      alert('请填写合同名称和供应商名称')
      return
    }

    if (!editingContract) {
      alert('该页面暂不支持新建合同，请在项目页中新建。')
      return
    }

    try {
      const materialRows = String(formData.materialList || '')
        .split('\n')
        .map((line) => String(line || '').trim())
        .filter(Boolean)
        .map((line) => ({
          name: line,
          specification: '',
          unit: '',
          quantity: '',
          unitPrice: '',
          totalPrice: '',
          remarks: '',
          category: '材料清单',
        }))

      const fd = new FormData()
      fd.append('projectId', String(formData.projectId || editingContract.projectId || ''))
      fd.append('contractName', String(formData.contractName || ''))
      fd.append('supplierName', String(formData.supplierName || ''))
      fd.append('contractAmount', String(Number(formData.contractAmount) || 0))
      fd.append('paymentMethod', String(formData.paymentMethod || ''))
      fd.append('materialList', JSON.stringify(materialRows))
      fd.append('deliveryLocation', String(formData.deliveryLocation || ''))
      fd.append('signDate', String(formData.signDate || ''))
      fd.append('startDate', String(formData.startDate || ''))
      fd.append('endDate', String(formData.endDate || ''))
      fd.append('warrantyPeriod', String(formData.warrantyPeriod || ''))
      fd.append('qualityStandard', String(formData.qualityStandard || ''))
      fd.append('contractNo', String(formData.contractNo || ''))
      fd.append('status', String(formData.status || 'draft'))

      await updateSupplierContract(editingContract.id, fd)
      INPUT_HISTORY_FIELDS.forEach((field) => rememberInputValue(field, formData[field]))
      await loadContracts()
      alert('合同更新成功')
      resetForm()
    } catch (err) {
      alert(err?.message || '合同更新失败')
    }
  }

  const handleEdit = (contract) => {
    setEditingContract(contract)
    setFormData({
      projectId: contract.projectId || '',
      contractNo: contract.contractNo || '',
      contractName: contract.contractName || '',
      supplierName: contract.supplierName || '',
      contractAmount: contract.contractAmount || '',
      paymentMethod: contract.paymentMethod || '',
      materialList: contract.materialList || '',
      signDate: contract.signDate || '',
      startDate: contract.startDate || '',
      endDate: contract.endDate || '',
      warrantyPeriod: contract.warrantyPeriod || '',
      deliveryLocation: contract.deliveryLocation || '',
      qualityStandard: contract.qualityStandard || '',
      status: contract.status || 'draft'
    })
    setShowForm(true)
  }

  const handleDelete = async (contract) => {
    if (!confirm(`确定删除合同 "${contract.contractName}" 吗？`)) return
    try {
      await deleteSupplierContract(contract.id)
      await loadContracts()
      alert('合同删除成功')
    } catch (err) {
      alert(err?.message || '合同删除失败')
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingContract(null)
    setFormData({
      projectId: '',
      contractNo: '',
      contractName: '',
      supplierName: '',
      contractAmount: '',
      paymentMethod: '',
      materialList: '',
      signDate: '',
      startDate: '',
      endDate: '',
      warrantyPeriod: '',
      deliveryLocation: '',
      qualityStandard: '',
      status: 'draft'
    })
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { text: '草稿', class: 'bg-gray-100 text-gray-800' },
      pending: { text: '待审批', class: 'bg-yellow-100 text-yellow-800' },
      approved: { text: '已审批', class: 'bg-green-100 text-green-800' },
      rejected: { text: '已拒绝', class: 'bg-red-100 text-red-800' }
    }
    const statusInfo = statusMap[status] || statusMap.draft
    return (
      <span className={`px-2 py-1 rounded text-sm ${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    )
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/supplier-library')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ← 返回
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">供应商合同管理</h1>
              <p className="text-gray-600">管理供应商采购合同</p>
            </div>
          </div>
          {canManage && (
            <button 
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + 新建合同
            </button>
          )}
        </div>
      </div>

      {/* 合同统计 */}
      {canManage && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{contracts.length}</div>
            <div className="text-gray-600">合同总数</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">
              ¥{(contracts.reduce((sum, c) => sum + (Number(c.contractAmount) || 0), 0) / 10000).toFixed(1)}万
            </div>
            <div className="text-gray-600">合同总额</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">
              {contracts.filter(c => c.status === 'pending').length}
            </div>
            <div className="text-gray-600">待审批</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">
              {contracts.filter(c => c.status === 'approved').length}
            </div>
            <div className="text-gray-600">已审批</div>
          </div>
        </div>
      )}

      {/* 合同列表 */}
      <div className="space-y-4">
        {contracts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">📄</div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">暂无合同</h3>
            <p className="text-gray-500 mb-6">开始创建您的第一个供应商合同</p>
            {canManage && (
              <button 
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + 创建合同
              </button>
            )}
          </div>
        ) : (
          contracts.map((contract) => (
            <div key={contract.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-gray-800">{contract.contractName}</h3>
                    {getStatusBadge(contract.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">合同号:</span> {contract.contractNo}
                    </div>
                    <div>
                      <span className="font-medium">供应商:</span> {contract.supplierName}
                    </div>
                    <div>
                      <span className="font-medium">金额:</span> ¥{Number(contract.contractAmount).toLocaleString()}
                    </div>
                  </div>
                  
                  {contract.paymentMethod && (
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">付款方式:</span> {contract.paymentMethod}
                    </div>
                  )}
                  
                  {contract.materialList && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">材料清单:</span> {contract.materialList}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 ml-6">
                  {canManage && (
                    <>
                      <button 
                        onClick={() => handleEdit(contract)}
                        className="bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200"
                      >
                        编辑
                      </button>
                      <button 
                        onClick={() => handleDelete(contract)}
                        className="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200"
                      >
                        删除
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 合同表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {editingContract ? '编辑合同' : '新建合同'}
              </h3>
              <button type="button" onClick={resetForm} className="text-gray-500 hover:text-gray-800 text-2xl">
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">合同名称 *</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    list="supplier-contract-history-contractName"
                    value={formData.contractName}
                    onChange={e => setFormData({...formData, contractName: e.target.value})}
                    onBlur={() => rememberInputValue('contractName', formData.contractName)}
                    placeholder="请输入合同名称"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">合同编号</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    list="supplier-contract-history-contractNo"
                    value={formData.contractNo}
                    onChange={e => setFormData({...formData, contractNo: e.target.value})}
                    onBlur={() => rememberInputValue('contractNo', formData.contractNo)}
                    placeholder="请输入合同编号"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">供应商名称 *</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    list="supplier-contract-history-supplierName"
                    value={formData.supplierName}
                    onChange={e => setFormData({...formData, supplierName: e.target.value})}
                    onBlur={() => rememberInputValue('supplierName', formData.supplierName)}
                    placeholder="请输入供应商名称"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">合同金额 (元)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border rounded px-3 py-2"
                    list="supplier-contract-history-contractAmount"
                    value={formData.contractAmount}
                    onChange={e => setFormData({...formData, contractAmount: e.target.value})}
                    onBlur={() => rememberInputValue('contractAmount', formData.contractAmount)}
                    placeholder="请输入合同金额"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">付款方式</label>
                <textarea
                  className="w-full border rounded px-3 py-2 h-20 resize-none"
                  value={formData.paymentMethod}
                  onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                  onBlur={() => rememberInputValue('paymentMethod', formData.paymentMethod)}
                  placeholder="请输入付款方式，如：30%预付，60%到货，10%验收"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">材料清单</label>
                <textarea
                  className="w-full border rounded px-3 py-2 h-20 resize-none"
                  value={formData.materialList}
                  onChange={e => setFormData({...formData, materialList: e.target.value})}
                  onBlur={() => rememberInputValue('materialList', formData.materialList)}
                  placeholder="请输入材料清单描述"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">签订日期</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={formData.signDate}
                    onChange={e => setFormData({...formData, signDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">开始日期</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">结束日期</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">质保期 (月)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    list="supplier-contract-history-warrantyPeriod"
                    value={formData.warrantyPeriod}
                    onChange={e => setFormData({...formData, warrantyPeriod: e.target.value})}
                    onBlur={() => rememberInputValue('warrantyPeriod', formData.warrantyPeriod)}
                    placeholder="请输入质保期（月）"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">交货地点</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    list="supplier-contract-history-deliveryLocation"
                    value={formData.deliveryLocation}
                    onChange={e => setFormData({...formData, deliveryLocation: e.target.value})}
                    onBlur={() => rememberInputValue('deliveryLocation', formData.deliveryLocation)}
                    placeholder="请输入交货地点"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">质量标准</label>
                <textarea
                  className="w-full border rounded px-3 py-2 h-20 resize-none"
                  value={formData.qualityStandard}
                  onChange={e => setFormData({...formData, qualityStandard: e.target.value})}
                  onBlur={() => rememberInputValue('qualityStandard', formData.qualityStandard)}
                  placeholder="请输入质量标准和验收要求"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">合同状态</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="draft">草稿</option>
                  <option value="pending">待审批</option>
                  <option value="approved">已审批</option>
                  <option value="rejected">已拒绝</option>
                </select>
              </div>
              <datalist id="supplier-contract-history-contractName">
                {(inputHistory.contractName || []).map((value) => (
                  <option key={`contractName-${value}`} value={value} />
                ))}
              </datalist>
              <datalist id="supplier-contract-history-contractNo">
                {(inputHistory.contractNo || []).map((value) => (
                  <option key={`contractNo-${value}`} value={value} />
                ))}
              </datalist>
              <datalist id="supplier-contract-history-supplierName">
                {(inputHistory.supplierName || []).map((value) => (
                  <option key={`supplierName-${value}`} value={value} />
                ))}
              </datalist>
              <datalist id="supplier-contract-history-contractAmount">
                {(inputHistory.contractAmount || []).map((value) => (
                  <option key={`contractAmount-${value}`} value={value} />
                ))}
              </datalist>
              <datalist id="supplier-contract-history-warrantyPeriod">
                {(inputHistory.warrantyPeriod || []).map((value) => (
                  <option key={`warrantyPeriod-${value}`} value={value} />
                ))}
              </datalist>
              <datalist id="supplier-contract-history-deliveryLocation">
                {(inputHistory.deliveryLocation || []).map((value) => (
                  <option key={`deliveryLocation-${value}`} value={value} />
                ))}
              </datalist>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                取消
              </button>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                {editingContract ? '更新' : '创建'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
