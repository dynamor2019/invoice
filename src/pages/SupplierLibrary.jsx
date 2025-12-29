import React, { useEffect, useState } from 'react'
import { getCurrentUser } from '../store/users'
import { getApiBase } from '../store/api'
import { 
  Close,
  Add,
  Edit,
  Store,
  Description,
  Star,
  Home
} from '@mui/icons-material'

const API_BASE = getApiBase()

function authHeaders(base = {}) {
  const u = getCurrentUser()
  const token = u?.token
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

// 供应商API函数
async function getSuppliers() {
  const res = await fetch(`${API_BASE}/suppliers`, { headers: authHeaders() })
  if (!res.ok) throw new Error('获取供应商失败')
  return res.json()
}

async function createSupplier(data) {
  const res = await fetch(`${API_BASE}/suppliers`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '创建供应商失败')
  }
  return res.json()
}

async function updateSupplier(id, data) {
  const res = await fetch(`${API_BASE}/suppliers/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '更新供应商失败')
  }
  return res.json()
}

async function getSupplierProducts(supplierId) {
  const res = await fetch(`${API_BASE}/suppliers/${supplierId}/products`, { headers: authHeaders() })
  if (!res.ok) throw new Error('获取产品失败')
  return res.json()
}

async function createSupplierProduct(supplierId, data) {
  const res = await fetch(`${API_BASE}/suppliers/${supplierId}/products`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '创建产品失败')
  }
  return res.json()
}

// 供应商评价API函数
async function getSupplierEvaluations(supplierName = null, projectId = null) {
  let url = `${API_BASE}/supplier-evaluations?`
  const params = new URLSearchParams()
  if (supplierName) params.append('supplierName', supplierName)
  if (projectId) params.append('projectId', projectId)
  
  const res = await fetch(url + params.toString(), { headers: authHeaders() })
  if (!res.ok) throw new Error('获取评价失败')
  return res.json()
}

async function createSupplierEvaluation(data) {
  const res = await fetch(`${API_BASE}/supplier-evaluations`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '创建评价失败')
  }
  return res.json()
}

async function getSupplierContracts() {
  const res = await fetch(`${API_BASE}/supplier-contracts`, { headers: authHeaders() })
  if (!res.ok) throw new Error('获取合同失败')
  return res.json()
}

// 供应商表单组件
function SupplierForm({ supplier, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contact: supplier?.contact || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    email: supplier?.email || '',
    businessLicense: supplier?.businessLicense || '',
    mainProducts: supplier?.mainProducts || '',
    qualifications: supplier?.qualifications || '',
    status: supplier?.status || 'active'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('请填写供应商名称')
      return
    }
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-lg font-bold">{supplier ? '编辑供应商' : '新建供应商'}</h3>
          <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <Close sx={{ fontSize: 20 }} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-gray-700 font-medium">供应商名称 *</span>
              <input 
                className="input w-full mt-1" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </label>

            <label className="block">
              <span className="text-gray-700 font-medium">联系人</span>
              <input 
                className="input w-full mt-1" 
                value={formData.contact} 
                onChange={e => setFormData({...formData, contact: e.target.value})}
              />
            </label>

            <label className="block">
              <span className="text-gray-700 font-medium">联系电话</span>
              <input 
                className="input w-full mt-1" 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </label>

            <label className="block">
              <span className="text-gray-700 font-medium">邮箱</span>
              <input 
                type="email"
                className="input w-full mt-1" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-gray-700 font-medium">地址</span>
            <input 
              className="input w-full mt-1" 
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </label>

          <label className="block">
            <span className="text-gray-700 font-medium">营业执照号</span>
            <input 
              className="input w-full mt-1" 
              value={formData.businessLicense} 
              onChange={e => setFormData({...formData, businessLicense: e.target.value})}
            />
          </label>

          <label className="block">
            <span className="text-gray-700 font-medium">主营产品</span>
            <textarea 
              className="input w-full mt-1 h-20" 
              value={formData.mainProducts} 
              onChange={e => setFormData({...formData, mainProducts: e.target.value})}
              placeholder="请描述主要供应的产品类别"
            />
          </label>

          <label className="block">
            <span className="text-gray-700 font-medium">资质证书</span>
            <textarea 
              className="input w-full mt-1 h-20" 
              value={formData.qualifications} 
              onChange={e => setFormData({...formData, qualifications: e.target.value})}
              placeholder="请列出相关的资质证书和认证"
            />
          </label>

          {supplier && (
            <label className="block">
              <span className="text-gray-700 font-medium">状态</span>
              <select 
                className="input w-full mt-1" 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="active">正常</option>
                <option value="inactive">停用</option>
              </select>
            </label>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn bg-gray-200 text-gray-800">取消</button>
          <button type="submit" className="btn bg-blue-600 text-white">
            {supplier ? '保存修改' : '创建供应商'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ProductForm({ supplierId, product, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    productName: product?.productName || '',
    specification: product?.specification || '',
    unit: product?.unit || '',
    unitPrice: product?.unitPrice || '',
    category: product?.category || '',
    description: product?.description || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.productName.trim()) {
      alert('请填写产品名称')
      return
    }
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">{product ? '编辑产品' : '新建产品'}</h3>
          <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <Close sx={{ fontSize: 20 }} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <label className="block">
            <span className="text-gray-700 font-medium">产品名称 *</span>
            <input 
              className="input w-full mt-1" 
              value={formData.productName} 
              onChange={e => setFormData({...formData, productName: e.target.value})}
              required
            />
          </label>

          <label className="block">
            <span className="text-gray-700 font-medium">规格型号</span>
            <input 
              className="input w-full mt-1" 
              value={formData.specification} 
              onChange={e => setFormData({...formData, specification: e.target.value})}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-gray-700 font-medium">单位</span>
              <input 
                className="input w-full mt-1" 
                value={formData.unit} 
                onChange={e => setFormData({...formData, unit: e.target.value})}
                placeholder="如：个、台、米"
              />
            </label>

            <label className="block">
              <span className="text-gray-700 font-medium">参考单价</span>
              <input 
                type="number"
                step="0.01"
                className="input w-full mt-1" 
                value={formData.unitPrice} 
                onChange={e => setFormData({...formData, unitPrice: e.target.value})}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-gray-700 font-medium">产品类别</span>
            <input 
              className="input w-full mt-1" 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})}
              placeholder="如：电气设备、建筑材料"
            />
          </label>

          <label className="block">
            <span className="text-gray-700 font-medium">产品描述</span>
            <textarea 
              className="input w-full mt-1 h-20" 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="详细的产品描述和特点"
            />
          </label>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn bg-gray-200 text-gray-800">取消</button>
          <button type="submit" className="btn bg-blue-600 text-white">
            {product ? '保存修改' : '创建产品'}
          </button>
        </div>
      </form>
    </div>
  )
}

function EvaluationForm({ supplierName, projects, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    supplierName: supplierName || '',
    projectId: '',
    contractId: '',
    rating: 5,
    qualityScore: 5,
    deliveryScore: 5,
    serviceScore: 5,
    comments: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.supplierName || !formData.projectId || !formData.rating) {
      alert('请填写供应商名称、项目和总体评分')
      return
    }
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">供应商评价</h3>
          <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <Close sx={{ fontSize: 20 }} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <label className="block">
            <span className="text-gray-700 font-medium">供应商名称 *</span>
            <input 
              className="input w-full mt-1" 
              value={formData.supplierName} 
              onChange={e => setFormData({...formData, supplierName: e.target.value})}
              required
            />
          </label>

          <label className="block">
            <span className="text-gray-700 font-medium">关联项目 *</span>
            <select 
              className="input w-full mt-1" 
              value={formData.projectId} 
              onChange={e => setFormData({...formData, projectId: e.target.value})}
              required
            >
              <option value="">请选择项目</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-gray-700 font-medium">总体评分 (1-5分) *</span>
            <select 
              className="input w-full mt-1" 
              value={formData.rating} 
              onChange={e => setFormData({...formData, rating: Number(e.target.value)})}
              required
            >
              <option value={5}>5分 - 优秀</option>
              <option value={4}>4分 - 良好</option>
              <option value={3}>3分 - 一般</option>
              <option value={2}>2分 - 较差</option>
              <option value={1}>1分 - 很差</option>
            </select>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-gray-700 font-medium text-sm">质量评分</span>
              <select 
                className="input w-full mt-1" 
                value={formData.qualityScore} 
                onChange={e => setFormData({...formData, qualityScore: Number(e.target.value)})}
              >
                {[5,4,3,2,1].map(score => (
                  <option key={score} value={score}>{score}分</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-gray-700 font-medium text-sm">交期评分</span>
              <select 
                className="input w-full mt-1" 
                value={formData.deliveryScore} 
                onChange={e => setFormData({...formData, deliveryScore: Number(e.target.value)})}
              >
                {[5,4,3,2,1].map(score => (
                  <option key={score} value={score}>{score}分</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-gray-700 font-medium text-sm">服务评分</span>
              <select 
                className="input w-full mt-1" 
                value={formData.serviceScore} 
                onChange={e => setFormData({...formData, serviceScore: Number(e.target.value)})}
              >
                {[5,4,3,2,1].map(score => (
                  <option key={score} value={score}>{score}分</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-gray-700 font-medium">评价意见</span>
            <textarea 
              className="input w-full mt-1 h-20" 
              value={formData.comments} 
              onChange={e => setFormData({...formData, comments: e.target.value})}
              placeholder="详细的评价意见和建议"
            />
          </label>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn bg-gray-200 text-gray-800">取消</button>
          <button type="submit" className="btn bg-blue-600 text-white">提交评价</button>
        </div>
      </form>
    </div>
  )
}

export default function SupplierLibrary() {
  const user = getCurrentUser()
  const [suppliers, setSuppliers] = useState([])
  const [contracts, setContracts] = useState([])
  const [projects, setProjects] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [showEvaluationForm, setShowEvaluationForm] = useState(false)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [currentSupplierId, setCurrentSupplierId] = useState(null)
  const [supplierProducts, setSupplierProducts] = useState({})
  const [filterRating, setFilterRating] = useState('')

  const isProcurementManager = user?.role === 'procurement_manager'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [suppliersData, contractsData, evaluationsData] = await Promise.all([
        getSuppliers(),
        getSupplierContracts(),
        getSupplierEvaluations()
      ])
      
      setSuppliers(suppliersData)
      setContracts(contractsData)
      setEvaluations(evaluationsData)
      
      // 获取项目信息用于评价表单
      const { listProjects } = await import('../store/projects')
      const projectsData = await listProjects()
      setProjects(projectsData)
      
    } catch (e) {
      console.error('加载数据失败:', e)
    }
  }

  const loadSupplierProducts = async (supplierId) => {
    try {
      const products = await getSupplierProducts(supplierId)
      setSupplierProducts(prev => ({ ...prev, [supplierId]: products }))
    } catch (e) {
      console.error('加载产品失败:', e)
    }
  }

  const handleCreateSupplier = async (data) => {
    try {
      await createSupplier(data)
      setShowSupplierForm(false)
      setEditingSupplier(null)
      loadData()
      alert('供应商创建成功')
    } catch (e) {
      alert(e.message)
    }
  }

  const handleUpdateSupplier = async (data) => {
    try {
      await updateSupplier(editingSupplier.id, data)
      setShowSupplierForm(false)
      setEditingSupplier(null)
      loadData()
      alert('供应商更新成功')
    } catch (e) {
      alert(e.message)
    }
  }

  const handleCreateProduct = async (data) => {
    try {
      await createSupplierProduct(currentSupplierId, data)
      setShowProductForm(false)
      setEditingProduct(null)
      setCurrentSupplierId(null)
      loadSupplierProducts(currentSupplierId)
      alert('产品创建成功')
    } catch (e) {
      alert(e.message)
    }
  }

  const handleCreateEvaluation = async (data) => {
    try {
      await createSupplierEvaluation(data)
      setShowEvaluationForm(false)
      loadData()
      alert('评价提交成功')
    } catch (e) {
      alert(e.message)
    }
  }

  const openSupplierDetail = async (supplier) => {
    if (selectedSupplier === supplier.id) {
      setSelectedSupplier(null)
    } else {
      setSelectedSupplier(supplier.id)
      if (!supplierProducts[supplier.id]) {
        await loadSupplierProducts(supplier.id)
      }
    }
  }

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600 bg-green-50'
    if (rating >= 3.5) return 'text-blue-600 bg-blue-50'
    if (rating >= 2.5) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getRatingBadgeClass = (rating) => {
    if (rating >= 4.5) return 'badge-success'
    if (rating >= 3.5) return 'badge-info'
    if (rating >= 2.5) return 'badge-warning'
    return 'badge-danger'
  }

  const getRatingText = (rating) => {
    if (rating >= 4.5) return '优秀'
    if (rating >= 3.5) return '良好'
    if (rating >= 2.5) return '一般'
    return '较差'
  }

  // 计算供应商的合同和评价信息
  const enrichedSuppliers = suppliers.map(supplier => {
    const supplierContracts = contracts.filter(c => c.supplierName === supplier.name)
    const supplierEvaluations = evaluations.filter(e => e.supplierName === supplier.name)
    
    return {
      ...supplier,
      contracts: supplierContracts,
      evaluations: supplierEvaluations,
      totalAmount: supplierContracts.reduce((sum, c) => sum + (Number(c.contractAmount) || 0), 0),
      averageRating: supplierEvaluations.length > 0 
        ? (supplierEvaluations.reduce((sum, e) => sum + e.rating, 0) / supplierEvaluations.length).toFixed(1)
        : null,
      contractCount: supplierContracts.length,
      evaluationCount: supplierEvaluations.length
    }
  })

  // 筛选供应商
  const filteredSuppliers = enrichedSuppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRating = !filterRating || 
      (supplier.averageRating && Number(supplier.averageRating) >= Number(filterRating))
    return matchesSearch && matchesRating
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 pb-20">
      {/* 页面标题 */}
      <div className="modern-card p-6 mb-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">供应商库</h1>
            <p className="text-gray-600">管理和查看供应商信息、评价及合作历史</p>
          </div>
          <div className="flex gap-3">
            {isProcurementManager && (
              <button 
                onClick={() => setShowSupplierForm(true)}
                className="modern-btn flex items-center gap-2"
              >
                <Add sx={{ fontSize: 16 }} />
                新建供应商
              </button>
            )}
            <button 
              onClick={() => setShowEvaluationForm(true)}
              className="modern-btn-secondary flex items-center gap-2"
            >
              <Star sx={{ fontSize: 16 }} />
              添加评价
            </button>
          </div>
        </div>
      </div>

      {/* 搜索和筛选栏 */}
      <div className="modern-card p-6 mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search sx={{ fontSize: 20 }} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="搜索供应商名称..."
                className="modern-input w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <select 
            className="modern-input"
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
          >
            <option value="">全部评级</option>
            <option value="4">4分以上</option>
            <option value="3">3分以上</option>
            <option value="2">2分以上</option>
          </select>
        </div>
      </div>

      {/* 供应商列表 */}
      <div className="space-y-4">
        {filteredSuppliers.length === 0 ? (
          <div className="modern-card p-12 text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store sx={{ fontSize: 40 }} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">暂无供应商</h3>
            <p className="text-gray-500 mb-6">开始添加您的第一个供应商</p>
            {isProcurementManager && (
              <button 
                onClick={() => setShowSupplierForm(true)}
                className="modern-btn flex items-center gap-2 mx-auto"
              >
                <Add sx={{ fontSize: 16 }} />
                添加供应商
              </button>
            )}
          </div>
        ) : (
          filteredSuppliers.map((supplier, index) => (
            <div 
              key={supplier.id} 
              className="modern-card p-6 animate-fade-in-up hover:shadow-lg transition-all duration-300"
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold text-gray-800">{supplier.name}</h3>
                    {supplier.averageRating && (
                      <span className={`modern-badge ${getRatingBadgeClass(supplier.averageRating)}`}>
                        ⭐ {supplier.averageRating}分 · {getRatingText(supplier.averageRating)}
                      </span>
                    )}
                    <span className={`modern-badge ${supplier.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {supplier.status === 'active' ? '正常' : '停用'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">联系人:</span>
                      <span className="font-medium text-gray-700">{supplier.contact || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">电话:</span>
                      <span className="font-medium text-gray-700">{supplier.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">合同数量:</span>
                      <span className="font-medium text-blue-600">{supplier.contractCount}个</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">合同总额:</span>
                      <span className="font-medium text-green-600">¥{supplier.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {supplier.mainProducts && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                      <span className="text-sm text-gray-600">主营产品: </span>
                      <span className="text-sm font-medium text-gray-800">{supplier.mainProducts}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3 ml-6">
                  {isProcurementManager && (
                    <button 
                      onClick={() => {
                        setEditingSupplier(supplier)
                        setShowSupplierForm(true)
                      }}
                      className="modern-btn-secondary flex items-center gap-2"
                    >
                      <Edit sx={{ fontSize: 16 }} />
                      编辑
                    </button>
                  )}
                  <button 
                    onClick={() => openSupplierDetail(supplier)}
                    className="modern-btn flex items-center gap-2"
                  >
                    {selectedSupplier === supplier.id ? '收起详情' : '查看详情'}
                    <ChevronRight 
                      sx={{ 
                        fontSize: 16, 
                        transform: selectedSupplier === supplier.id ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease'
                      }} 
                    />
                  </button>
                </div>
              </div>
            <option value="">全部评级</option>
            <option value="4.5">优秀 (4.5分以上)</option>
            <option value="3.5">良好 (3.5分以上)</option>
            <option value="2.5">一般 (2.5分以上)</option>
            <option value="1">较差 (2.5分以下)</option>
          </select>
          {isProcurementManager && (
            <button 
              onClick={() => setShowSupplierForm(true)}
              className="btn bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Add sx={{ fontSize: 16 }} />
              新建供应商
            </button>
          )}
          <button 
            onClick={() => setShowEvaluationForm(true)}
            className="btn bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Star sx={{ fontSize: 16 }} />
            添加评价
          </button>
        </div>
      </div>

      {/* 供应商列表 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">供应商库</h2>
          <p className="text-sm text-gray-600 mt-1">管理供应商信息、产品目录和评价记录</p>
        </div>
        
        <div className="divide-y">
          {filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">🏢</div>
              <div>暂无供应商记录</div>
              {isProcurementManager && (
                <button 
                  onClick={() => setShowSupplierForm(true)}
                  className="btn bg-blue-600 text-white mt-4"
                >
                  创建第一个供应商
                </button>
              )}
            </div>
          ) : (
            filteredSuppliers.map(supplier => (
              <div key={supplier.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-lg">{supplier.name}</h3>
                      {supplier.averageRating && (
                        <span className={`px-2 py-1 rounded text-xs ${getRatingColor(supplier.averageRating)}`}>
                          {supplier.averageRating}分 · {getRatingText(supplier.averageRating)}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs ${supplier.status === 'active' ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'}`}>
                        {supplier.status === 'active' ? '正常' : '停用'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>联系人: {supplier.contact || '-'} | 电话: {supplier.phone || '-'}</div>
                      <div>合同数量: {supplier.contractCount}个 | 合同总额: ¥{supplier.totalAmount.toLocaleString()} | 评价次数: {supplier.evaluationCount}次</div>
                      {supplier.mainProducts && (
                        <div>主营产品: {supplier.mainProducts}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isProcurementManager && (
                      <button 
                        onClick={() => {
                          setEditingSupplier(supplier)
                          setShowSupplierForm(true)
                        }}
                        className="btn bg-gray-100 text-gray-700 text-sm"
                      >
                        编辑
                      </button>
                    )}
                    <button 
                      onClick={() => openSupplierDetail(supplier)}
                      className="btn bg-gray-100 text-gray-700 text-sm"
                    >
                      {selectedSupplier === supplier.id ? '收起' : '详情'}
                    </button>
                  </div>
                </div>
                
                {selectedSupplier === supplier.id && (
                  <div className="mt-4 pt-4 border-t bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* 基本信息 */}
                      <div>
                        <h4 className="font-medium mb-3">基本信息</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-600">地址:</span> {supplier.address || '-'}</div>
                          <div><span className="text-gray-600">邮箱:</span> {supplier.email || '-'}</div>
                          <div><span className="text-gray-600">营业执照:</span> {supplier.businessLicense || '-'}</div>
                          {supplier.qualifications && (
                            <div><span className="text-gray-600">资质证书:</span> {supplier.qualifications}</div>
                          )}
                        </div>
                      </div>
                      
                      {/* 产品目录 */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">产品目录</h4>
                          {isProcurementManager && (
                            <button 
                              onClick={() => {
                                setCurrentSupplierId(supplier.id)
                                setShowProductForm(true)
                              }}
                              className="btn bg-blue-50 text-blue-700 text-xs"
                            >
                              + 添加产品
                            </button>
                          )}
                        </div>
                        {supplierProducts[supplier.id] ? (
                          supplierProducts[supplier.id].length === 0 ? (
                            <div className="text-gray-500 text-sm">暂无产品记录</div>
                          ) : (
                            <div className="space-y-2">
                              {supplierProducts[supplier.id].map(product => (
                                <div key={product.id} className="bg-white p-3 rounded border text-sm">
                                  <div className="font-medium">{product.productName}</div>
                                  <div className="text-gray-600 mt-1">
                                    规格: {product.specification || '-'} | 单位: {product.unit || '-'}
                                  </div>
                                  {product.unitPrice > 0 && (
                                    <div className="text-gray-600">参考价: ¥{product.unitPrice}</div>
                                  )}
                                  {product.category && (
                                    <div className="text-gray-500 text-xs">类别: {product.category}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          <div className="text-gray-500 text-sm">加载中...</div>
                        )}
                      </div>
                      
                      {/* 评价记录 */}
                      <div>
                        <h4 className="font-medium mb-3">评价记录</h4>
                        {supplier.evaluations.length === 0 ? (
                          <div className="text-gray-500 text-sm">暂无评价记录</div>
                        ) : (
                          <div className="space-y-2">
                            {supplier.evaluations.map(evaluation => {
                              const project = projects.find(p => p.id === evaluation.projectId)
                              return (
                                <div key={evaluation.id} className="bg-white p-3 rounded border text-sm">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">总评: {evaluation.rating}分</span>
                                    <span className="text-gray-500 text-xs">
                                      {new Date(evaluation.evaluatedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="text-gray-600 mb-2">
                                    项目: {project?.name || '未知项目'}
                                  </div>
                                  {(evaluation.qualityScore || evaluation.deliveryScore || evaluation.serviceScore) && (
                                    <div className="text-xs text-gray-500 mb-2">
                                      质量:{evaluation.qualityScore}分 | 交期:{evaluation.deliveryScore}分 | 服务:{evaluation.serviceScore}分
                                    </div>
                                  )}
                                  {evaluation.comments && (
                                    <div className="text-gray-600 text-xs bg-gray-50 p-2 rounded">
                                      {evaluation.comments}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 表单弹窗 */}
      {showSupplierForm && (
        <SupplierForm 
          supplier={editingSupplier}
          onSubmit={editingSupplier ? handleUpdateSupplier : handleCreateSupplier}
          onCancel={() => {
            setShowSupplierForm(false)
            setEditingSupplier(null)
          }}
        />
      )}

      {showProductForm && (
        <ProductForm 
          supplierId={currentSupplierId}
          product={editingProduct}
          onSubmit={handleCreateProduct}
          onCancel={() => {
            setShowProductForm(false)
            setEditingProduct(null)
            setCurrentSupplierId(null)
          }}
        />
      )}

      {showEvaluationForm && (
        <EvaluationForm 
          projects={projects}
          onSubmit={handleCreateEvaluation}
          onCancel={() => setShowEvaluationForm(false)}
        />
      )}
    </div>
  )
}