import { useEffect, useState } from 'react'
import { getCurrentUser } from '../store/users'
import { 
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listMaterials,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  searchMaterials
} from '../store/projects'
import { 
  FolderOpen,
  Add,
  Edit,
  Delete,
  Business,
  AttachMoney,
  CalendarToday,
  Person,
  Category,
  Assignment
} from '@mui/icons-material'

export default function Projects() {
  const user = getCurrentUser()
  const [projects, setProjects] = useState([])
  const [materials, setMaterials] = useState([])
  const [contracts, setContracts] = useState([])
  const [activeTab, setActiveTab] = useState('projects')
  const [selectedProject, setSelectedProject] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [showMaterialForm, setShowMaterialForm] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [showContractForm, setShowContractForm] = useState(false)
  const [editingContract, setEditingContract] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contractNo: '',
    client: '',
    projectOverview: '',
    totalBudget: '',
    settlementAmount: '',
    paymentMethod: '',
    invoiceInfo: '',
    description: '',
    startDate: '',
    endDate: '',
    projectManager: '',
    status: 'draft',
    contractFile: null,
    contractFileName: '',
    otherFiles: [],
    otherFileNames: []
  })
  const [materialFormData, setMaterialFormData] = useState({
    name: '',
    specification: '',
    unit: '',
    quantity: '',
    unitPrice: '',
    totalPrice: '',
    supplier: '',
    type: '材料清单',
    remarks: ''
  })
  const [contractFormData, setContractFormData] = useState({
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
    projectId: '',
    contactPerson: '',
    contactPhone: '',
    supplierAddress: '',
    taxNumber: '',
    bankAccount: '',
    status: 'draft',
    contractFile: null,
    contractFileName: ''
  })
  
  // 项目清单条目管理
  const [projectItems, setProjectItems] = useState([])
  const [newProjectItem, setNewProjectItem] = useState({
    name: '',
    specification: '',
    unit: '',
    quantity: '',
    unitPrice: '',
    totalPrice: '',
    remarks: '',
    category: '材料清单'
  })
  
  // 材料搜索联想功能
  const [materialSuggestions, setMaterialSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [showMaterialFormSuggestions, setShowMaterialFormSuggestions] = useState(false)

  const isPM = user?.role === 'project_manager'
  const isAdmin = user?.role === 'admin'
  const isChairman = user?.role === 'chairman'
  const isViceChairman = user?.role === 'vice_chairman'
  const isGM = user?.role === 'gm'
  const isProcurementManager = user?.role === 'procurement_manager'
  const isCostManager = user?.role === 'cost_manager'
  const canManage = isAdmin // 只有管理员可以管理项目，项目经理只能查看
  const canManageProjects = isAdmin || isPM // 只有项目经理和管理员可以新建项目
  const canViewDashboard = isChairman || isViceChairman || isGM || isAdmin

  useEffect(() => {
    loadProjects()
    if (isProcurementManager || isCostManager || isAdmin) {
      loadContracts()
    }
  }, [])

  useEffect(() => {
    if (selectedProject && (isProcurementManager || isCostManager || isAdmin)) {
      loadMaterials(selectedProject.id)
    }
  }, [selectedProject])

  const loadProjects = async () => {
    try {
      const data = await listProjects()
      console.log('加载到的项目:', data)
      setProjects(data)
      if (data.length > 0 && !selectedProject && (isProcurementManager || isCostManager || isAdmin)) {
        console.log('自动选择第一个项目:', data[0])
        setSelectedProject(data[0])
      }
    } catch (e) {
      console.error('加载项目失败:', e)
      alert(`加载项目失败: ${e.message}`)
    }
  }

  const loadMaterials = async (projectId) => {
    try {
      console.log('正在加载项目材料:', projectId)
      const data = await listMaterials(projectId)
      console.log('加载到的材料数量:', data.length)
      setMaterials(data)
    } catch (e) {
      console.error('加载材料失败:', e)
      alert(`加载材料失败: ${e.message}`)
    }
  }

  const loadContracts = async () => {
    try {
      // 模拟合同数据
      setContracts([
        {
          id: '1',
          contractNo: 'HT-XJL-GY-001',
          contractName: '630kVA箱变设备采购合同',
          projectId: 'PROJ-2025-001',
          supplierName: '北京电力设备制造有限公司',
          contractAmount: 550000,
          paymentMethod: '30%预付，60%到货，10%验收',
          materialList: '箱变设备、配套电缆、安装材料',
          projectList: '新疆路项目630kVA箱变安装工程',
          status: 'approved',
          createdAt: '2025-01-15'
        },
        {
          id: '2',
          contractNo: 'HT-ZN-GY-001',
          contractName: '智能制造设备采购合同',
          projectId: 'PROJ-2025-002',
          supplierName: '深圳智能控制系统有限公司',
          contractAmount: 3650000,
          paymentMethod: '20%预付，70%到货，10%验收',
          materialList: '智能控制系统、传感器、执行器',
          projectList: '智能制造产线升级改造项目',
          status: 'pending',
          createdAt: '2025-01-20'
        }
      ])
    } catch (e) {
      console.error('加载合同失败:', e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.totalBudget) {
      alert('请填写项目名称和预算')
      return
    }

    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData)
        alert('项目更新成功')
      } else {
        await createProject(formData)
        alert('项目创建成功')
      }
      
      await loadProjects()
      resetForm()
    } catch (e) {
      alert(e.message || '操作失败')
    }
  }

  const handleEdit = (project) => {
    setEditingProject(project)
    setFormData({
      name: project.name || '',
      code: project.code || '',
      contractNo: project.contractNo || '',
      client: project.client || '',
      projectOverview: project.projectOverview || '',
      totalBudget: project.totalBudget || '',
      settlementAmount: project.settlementAmount || '',
      paymentMethod: project.paymentMethod || '',
      invoiceInfo: project.invoiceInfo || '',
      description: project.description || '',
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      projectManager: project.projectManager || '',
      status: project.status || 'draft'
    })
    setShowForm(true)
  }

  const handleDelete = async (project) => {
    if (!confirm(`确定要删除项目"${project.name}"吗？`)) return
    
    try {
      await deleteProject(project.id)
      await loadProjects()
      alert('项目删除成功')
    } catch (e) {
      alert(e.message || '删除失败')
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingProject(null)
    setFormData({
      name: '',
      code: '',
      contractNo: '',
      client: '',
      projectOverview: '',
      totalBudget: '',
      settlementAmount: '',
      paymentMethod: '',
      invoiceInfo: '',
      description: '',
      startDate: '',
      endDate: '',
      projectManager: '',
      status: 'draft',
      contractFile: null,
      contractFileName: '',
      otherFiles: [],
      otherFileNames: []
    })
  }

  // 材料管理函数
  const handleMaterialSubmit = async (e) => {
    e.preventDefault()
    if (!materialFormData.name.trim()) {
      alert('请填写材料名称')
      return
    }

    if (!selectedProject) {
      alert('请先选择一个项目')
      return
    }

    try {
      const materialData = {
        ...materialFormData,
        quantity: Number(materialFormData.quantity) || 0,
        unitPrice: Number(materialFormData.unitPrice) || 0,
        totalPrice: Number(materialFormData.totalPrice) || 0
      }

      if (editingMaterial) {
        await updateMaterial(selectedProject.id, editingMaterial.id, materialData)
        alert('材料更新成功')
      } else {
        await addMaterial(selectedProject.id, materialData)
        alert('材料添加成功')
      }
      
      // 重新加载材料列表
      await loadMaterials(selectedProject.id)
      resetMaterialForm()
    } catch (e) {
      alert(`操作失败: ${e.message}`)
    }
  }

  const handleMaterialEdit = (material) => {
    setEditingMaterial(material)
    setMaterialFormData({
      name: material.name || '',
      specification: material.specification || '',
      unit: material.unit || '',
      quantity: material.quantity || '',
      unitPrice: material.unitPrice || '',
      totalPrice: material.totalPrice || '',
      supplier: material.supplier || '',
      type: material.type || '材料清单',
      remarks: material.remarks || ''
    })
    setShowMaterialForm(true)
  }

  const handleMaterialDelete = async (material) => {
    if (!confirm(`确定要删除材料"${material.name}"吗？`)) return
    
    if (!selectedProject) {
      alert('请先选择一个项目')
      return
    }

    try {
      await deleteMaterial(selectedProject.id, material.id)
      alert('材料删除成功')
      // 重新加载材料列表
      await loadMaterials(selectedProject.id)
    } catch (e) {
      alert(`删除失败: ${e.message}`)
    }
  }

  const resetMaterialForm = () => {
    setShowMaterialForm(false)
    setEditingMaterial(null)
    setShowMaterialFormSuggestions(false)
    setMaterialSuggestions([])
    setMaterialFormData({
      name: '',
      specification: '',
      unit: '',
      quantity: '',
      unitPrice: '',
      totalPrice: '',
      supplier: '',
      type: '材料清单',
      remarks: ''
    })
  }

  // 合同管理函数
  const handleContractSubmit = (e) => {
    e.preventDefault()
    if (!contractFormData.contractName.trim() || !contractFormData.supplierName.trim()) {
      alert('请填写合同名称和供应商名称')
      return
    }

    const newContract = {
      id: Date.now().toString(),
      ...contractFormData,
      contractAmount: Number(contractFormData.contractAmount) || 0,
      projectItems: projectItems // 保存项目清单条目
    }

    if (editingContract) {
      setContracts(contracts.map(c => c.id === editingContract.id ? { ...newContract, id: editingContract.id } : c))
      alert('合同更新成功')
    } else {
      setContracts([...contracts, newContract])
      alert('合同创建成功')
    }
    
    resetContractForm()
  }

  const handleContractEdit = (contract) => {
    setEditingContract(contract)
    setContractFormData({
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
      projectId: contract.projectId || '',
      contactPerson: contract.contactPerson || '',
      contactPhone: contract.contactPhone || '',
      supplierAddress: contract.supplierAddress || '',
      taxNumber: contract.taxNumber || '',
      bankAccount: contract.bankAccount || '',
      status: contract.status || 'draft'
    })
    // 加载项目清单条目
    setProjectItems(contract.projectItems || [])
    setShowContractForm(true)
  }

  const handleContractDelete = (contract) => {
    if (!confirm(`确定要删除合同"${contract.contractName}"吗？`)) return
    setContracts(contracts.filter(c => c.id !== contract.id))
    alert('合同删除成功')
  }

  const resetContractForm = () => {
    setShowContractForm(false)
    setEditingContract(null)
    setProjectItems([]) // 重置项目清单条目
    setNewProjectItem({
      name: '',
      specification: '',
      unit: '',
      quantity: '',
      unitPrice: '',
      totalPrice: '',
      remarks: '',
      category: '材料清单'
    })
    setContractFormData({
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
      projectId: '',
      contactPerson: '',
      contactPhone: '',
      supplierAddress: '',
      taxNumber: '',
      bankAccount: '',
      status: 'draft',
      contractFile: null,
      contractFileName: ''
    })
  }

  // 生成合同编号：HN-CG-Year-Month-Day-Sequence
  const generateContractNo = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    
    // 获取今天已创建的合同数量作为序号
    const todayContracts = contracts.filter(c => {
      const cDate = new Date(c.createdAt || new Date())
      return cDate.getFullYear() === year && 
             cDate.getMonth() === now.getMonth() && 
             cDate.getDate() === now.getDate()
    })
    const sequence = String(todayContracts.length + 1).padStart(3, '0')
    
    return `HN-CG-${year}-${month}-${day}-${sequence}`
  }

  // 项目清单条目管理函数
  const addProjectItem = () => {
    if (!newProjectItem.name.trim()) {
      alert('请填写项目名称')
      return
    }
    
    const item = {
      id: Date.now().toString(),
      ...newProjectItem,
      quantity: Number(newProjectItem.quantity) || 0,
      unitPrice: Number(newProjectItem.unitPrice) || 0,
      totalPrice: Number(newProjectItem.totalPrice) || 0
    }
    
    setProjectItems([...projectItems, item])
    setNewProjectItem({
      name: '',
      specification: '',
      unit: '',
      quantity: '',
      unitPrice: '',
      totalPrice: '',
      remarks: '',
      category: '材料清单'
    })
    setShowSuggestions(false)
  }

  const removeProjectItem = (id) => {
    setProjectItems(projectItems.filter(item => item.id !== id))
  }

  const updateProjectItemPrice = (field, value) => {
    const updatedItem = { ...newProjectItem, [field]: value }
    
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = Number(updatedItem.quantity) || 0
      const unitPrice = Number(updatedItem.unitPrice) || 0
      updatedItem.totalPrice = (quantity * unitPrice).toFixed(2)
    }
    
    setNewProjectItem(updatedItem)
  }

  // 材料搜索联想功能
  const searchMaterialsWithDelay = async (query) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    if (!query.trim()) {
      setMaterialSuggestions([])
      setShowSuggestions(false)
      return
    }
    
    const timeout = setTimeout(async () => {
      try {
        console.log('搜索材料:', query) // 调试日志
        const results = await searchMaterials(query)
        console.log('搜索结果:', results) // 调试日志
        setMaterialSuggestions(results.slice(0, 10)) // 限制显示10个建议
        setShowSuggestions(results.length > 0)
      } catch (e) {
        console.error('搜索材料失败:', e)
        setMaterialSuggestions([])
        setShowSuggestions(false)
      }
    }, 300) // 300ms延迟
    
    setSearchTimeout(timeout)
  }

  const selectMaterialSuggestion = (material) => {
    console.log('选择材料建议:', material) // 调试日志
    setNewProjectItem({
      ...newProjectItem,
      name: material.name || '',
      specification: material.specification || '',
      unit: material.unit || '',
      unitPrice: material.unitPrice || ''
    })
    setShowSuggestions(false)
    setMaterialSuggestions([])
  }

  const handleMaterialNameChange = (value) => {
    console.log('材料名称输入变化:', value) // 调试日志
    setNewProjectItem({...newProjectItem, name: value})
    if (value.trim().length >= 1) { // 至少输入1个字符才开始搜索
      searchMaterialsWithDelay(value)
    } else {
      setMaterialSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleMaterialFormNameChange = (value) => {
    setMaterialFormData({...materialFormData, name: value})
    if (value.trim().length >= 1) {
      searchMaterialsWithDelay(value)
      setShowMaterialFormSuggestions(true)
    } else {
      setMaterialSuggestions([])
      setShowMaterialFormSuggestions(false)
    }
  }

  const selectMaterialFormSuggestion = (material) => {
    setMaterialFormData({
      ...materialFormData,
      name: material.name || '',
      specification: material.specification || '',
      unit: material.unit || '',
      unitPrice: material.unitPrice || ''
    })
    setShowMaterialFormSuggestions(false)
    setMaterialSuggestions([])
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { text: '草稿', class: 'badge-info' },
      pending: { text: '待审批', class: 'badge-warning' },
      approved: { text: '已审批', class: 'badge-success' },
      rejected: { text: '已拒绝', class: 'badge-danger' }
    }
    const statusInfo = statusMap[status] || statusMap.draft
    return (
      <span className={`modern-badge ${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    )
  }

  return (
    <div className="min-h-screen p-2 pb-16">
      {/* 页面头部 */}
      <div className="modern-card p-3 mb-3 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Business className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800">
                {isProcurementManager || isCostManager ? '采购管理' : '项目管理'}
              </h1>
              <p className="text-xs text-gray-600">
                {isProcurementManager || isCostManager
                  ? '项目信息、材料清单、采购合同统一管理'
                  : canViewDashboard ? '项目看板和管理' : '管理和查看项目信息'
                }
              </p>
            </div>
          </div>
          {canManageProjects && (
            <button 
              onClick={() => setShowForm(true)}
              className="modern-btn flex items-center gap-1 text-xs px-2 py-1"
            >
              <Add className="text-sm" />
              <span className="hidden sm:inline">新建项目</span>
              <span className="sm:hidden">新建</span>
            </button>
          )}
        </div>
      </div>

      {/* 项目统计看板 - 仅董事长、副董事长、总经理可见 */}
      {canViewDashboard && (
        <>
          {/* 主要统计卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
            <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-base font-bold mb-2" style={{ color: 'white !important' }}>项目总数</p>
                  <p className="text-3xl font-black text-white" style={{ color: 'white !important' }}>{projects.length || 0}</p>
                </div>
                <Business className="text-4xl text-white opacity-80" style={{ color: 'white !important' }} />
              </div>
            </div>
            
            <div className="p-4 bg-green-600 text-white rounded-2xl shadow-lg animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-base font-bold mb-2" style={{ color: 'white !important' }}>项目总额</p>
                  <p className="text-xl font-black text-white" style={{ color: 'white !important' }}>
                    ¥{(projects.reduce((sum, p) => sum + (Number(p.totalBudget) || 0), 0) / 10000).toFixed(1) || '0.0'}万
                  </p>
                </div>
                <AttachMoney className="text-4xl text-white opacity-80" style={{ color: 'white !important' }} />
              </div>
            </div>
            
            <div className="p-4 bg-teal-600 text-white rounded-2xl shadow-lg animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-base font-bold mb-2" style={{ color: 'white !important' }}>剩余金额</p>
                  <p className="text-xl font-black text-white" style={{ color: 'white !important' }}>
                    ¥{(projects.reduce((sum, p) => sum + (Number(p.balance) || Number(p.totalBudget) || 0), 0) / 10000).toFixed(1) || '0.0'}万
                  </p>
                </div>
                <svg className="w-10 h-10 text-white opacity-80" fill="white" viewBox="0 0 24 24" style={{ color: 'white !important' }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </div>
            
            <div className="p-4 bg-orange-600 text-white rounded-2xl shadow-lg animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-base font-bold mb-2" style={{ color: 'white !important' }}>进行中</p>
                  <p className="text-3xl font-black text-white" style={{ color: 'white !important' }}>
                    {projects.filter(p => p.approvalStatus === 'approved' || p.approvalStatus === 'pending').length || 0}
                  </p>
                </div>
                <CalendarToday className="text-4xl text-white opacity-80" style={{ color: 'white !important' }} />
              </div>
            </div>
          </div>

          {/* 项目状态图表和详细统计 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
            {/* 项目状态饼图 */}
            <div className="modern-card p-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <h3 className="text-base font-bold text-gray-800 mb-4">项目状态分布</h3>
              <div className="flex items-center justify-center">
                <div className="relative w-24 h-24">
                  {/* 简单的CSS饼图 */}
                  <div className="w-full h-full rounded-full bg-gradient-to-r from-green-400 to-blue-500 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center">
                        <span className="text-base font-bold text-gray-800">{projects.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700 font-medium">已审批</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{projects.filter(p => p.approvalStatus === 'approved').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm text-gray-700 font-medium">待审批</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{projects.filter(p => p.approvalStatus === 'pending').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-sm text-gray-700 font-medium">草稿</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{projects.filter(p => p.approvalStatus === 'draft' || !p.approvalStatus).length}</span>
                </div>
              </div>
            </div>

            {/* 预算使用情况 */}
            <div className="modern-card p-4 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <h3 className="text-base font-bold text-gray-800 mb-4">预算使用情况</h3>
              <div className="space-y-4">
                {projects.slice(0, 5).map((project, index) => {
                  const totalBudget = Number(project.totalBudget) || 0
                  const usedBudget = totalBudget - (Number(project.balance) || totalBudget)
                  const usagePercent = totalBudget > 0 ? (usedBudget / totalBudget * 100) : 0
                  
                  return (
                    <div key={project.id} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 truncate">{project.name}</span>
                        <span className="text-sm font-bold text-gray-800">{usagePercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>已用: ¥{(usedBudget / 10000).toFixed(1)}万</span>
                        <span>总额: ¥{(totalBudget / 10000).toFixed(1)}万</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 采购经理/造价经理专用 - 项目选择和信息展示（在标签上方） */}
      {(isProcurementManager || isCostManager) && (
        <div className="space-y-2 mb-3 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
          {/* 项目选择下拉 */}
          <div className="modern-card p-3">
            <label className="block text-gray-700 font-medium mb-2 text-xs">选择项目</label>
            <select
              className="modern-input w-full text-xs"
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value)
                setSelectedProject(project)
              }}
            >
              <option value="">-- 选择项目 --</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} (¥{(Number(project.totalBudget || 0) / 10000).toFixed(1)}万)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 采购经理/造价经理专用标签页导航 */}
      {(isProcurementManager || isCostManager) && (
        <div className="modern-card mb-3 animate-fade-in-up" style={{ animationDelay: '0.75s' }}>
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'projects'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Business className="text-sm mr-1" />
              项目介绍
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'materials'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Category className="text-sm mr-1" />
              材料清单
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'contracts'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Assignment className="text-sm mr-1" />
              采购合同
            </button>
          </div>
        </div>
      )}

      {/* 内容区域 - 根据角色和标签显示不同内容 */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
        {/* 采购经理/造价经理 - 项目介绍标签 */}
        {(isProcurementManager || isCostManager) && activeTab === 'projects' && (
          <div className="space-y-3">
            {!selectedProject ? (
              <div className="modern-card p-6 text-center text-gray-500 text-xs">
                请先选择一个项目
              </div>
            ) : (
              <div className="modern-card p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-gray-600 font-medium text-sm mb-1">项目名称</p>
                    <p className="text-gray-800 text-sm font-semibold">{selectedProject.name}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-gray-600 font-medium text-sm mb-1">项目编号</p>
                    <p className="text-gray-800 text-sm">{selectedProject.code || '-'}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-gray-600 font-medium text-sm mb-1">合同编号</p>
                    <p className="text-gray-800 text-sm">{selectedProject.contractNo || '-'}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-gray-600 font-medium text-sm mb-1">甲方单位</p>
                    <p className="text-gray-800 text-sm truncate">{selectedProject.client || '-'}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-gray-600 font-medium text-sm mb-1">合同金额</p>
                    <p className="text-gray-800 text-sm font-semibold">¥{Number(selectedProject.totalBudget || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-gray-600 font-medium text-sm mb-1">结算金额</p>
                    <p className="text-gray-800 text-sm">¥{Number(selectedProject.settlementAmount || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-gray-600 font-medium text-sm mb-1">项目经理</p>
                    <p className="text-gray-800 text-sm truncate">{selectedProject.projectManager || '-'}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-gray-600 font-medium text-sm mb-1">开始时间</p>
                    <p className="text-gray-800 text-sm">{selectedProject.startDate || '-'}</p>
                  </div>
                </div>
                
                {selectedProject.projectOverview && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 font-medium text-sm mb-2">工程概况</p>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap">{selectedProject.projectOverview}</p>
                  </div>
                )}
                
                {selectedProject.paymentMethod && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 font-medium mb-2 text-sm">付款方式</p>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap">{selectedProject.paymentMethod}</p>
                  </div>
                )}
                
                {selectedProject.invoiceInfo && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 font-medium mb-2 text-sm">开票信息</p>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap">{selectedProject.invoiceInfo}</p>
                  </div>
                )}
                
                {selectedProject.description && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 font-medium mb-2 text-sm">项目描述</p>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap">{selectedProject.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 采购经理/造价经理 - 材料清单标签 */}
        {(isProcurementManager || isCostManager) && activeTab === 'materials' && (
          <div className="space-y-3">
            <div className="modern-card p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-800">
                  材料清单 {selectedProject && `- ${selectedProject.name}`}
                </h3>
                <button 
                  onClick={() => {
                    resetMaterialForm()
                    setShowMaterialForm(true)
                  }}
                  className="modern-btn flex items-center gap-1 text-xs px-2 py-1"
                >
                  <Add className="text-sm" />
                  添加材料
                </button>
              </div>
            </div>

            {!selectedProject ? (
              <div className="modern-card p-6 text-center text-gray-500 text-xs">
                请先选择一个项目
              </div>
            ) : (
              <>
                {/* 按分类显示材料 */}
                {['材料清单', '施工清单', '调试清单'].map((category) => {
                  const categoryMaterials = materials.filter(m => m.type === category)
                  return (
                    <div key={category} className="modern-card p-3">
                      <h4 className="text-xs font-bold text-gray-800 mb-3 pb-2 border-b-2 border-blue-500">
                        {category} ({categoryMaterials.length})
                      </h4>
                      
                      {categoryMaterials.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-xs">
                          暂无{category}数据
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="modern-table w-full text-sm">
                            <thead>
                              <tr>
                                <th className="text-sm">材料名称</th>
                                <th className="text-sm">规格型号</th>
                                <th className="text-sm">单位</th>
                                <th className="text-sm">数量</th>
                                <th className="text-sm">单价</th>
                                <th className="text-sm">总价</th>
                                <th className="text-sm">供应商</th>
                                <th className="text-sm">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categoryMaterials.map((material) => (
                                <tr key={material.id} className={`border-t ${editingMaterial?.id === material.id ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                                  {editingMaterial?.id === material.id ? (
                                    <>
                                      <td className="p-1"><input type="text" className="modern-input w-full text-xs" value={materialFormData.name} onChange={e => setMaterialFormData({...materialFormData, name: e.target.value})} /></td>
                                      <td className="p-1"><input type="text" className="modern-input w-full text-xs" value={materialFormData.specification} onChange={e => setMaterialFormData({...materialFormData, specification: e.target.value})} /></td>
                                      <td className="p-1"><input type="text" className="modern-input w-full text-xs" value={materialFormData.unit} onChange={e => setMaterialFormData({...materialFormData, unit: e.target.value})} /></td>
                                      <td className="p-1"><input type="number" step="0.01" className="modern-input w-full text-xs" value={materialFormData.quantity} onChange={e => {const q = e.target.value; const tp = q && materialFormData.unitPrice ? (Number(q) * Number(materialFormData.unitPrice)).toFixed(2) : ''; setMaterialFormData({...materialFormData, quantity: q, totalPrice: tp})}} /></td>
                                      <td className="p-1"><input type="number" step="0.01" className="modern-input w-full text-xs" value={materialFormData.unitPrice} onChange={e => {const p = e.target.value; const tp = materialFormData.quantity && p ? (Number(materialFormData.quantity) * Number(p)).toFixed(2) : ''; setMaterialFormData({...materialFormData, unitPrice: p, totalPrice: tp})}} /></td>
                                      <td className="p-1"><input type="number" step="0.01" className="modern-input w-full text-xs" value={materialFormData.totalPrice} onChange={e => setMaterialFormData({...materialFormData, totalPrice: e.target.value})} /></td>
                                      <td className="p-1"><input type="text" className="modern-input w-full text-xs" value={materialFormData.supplier} onChange={e => setMaterialFormData({...materialFormData, supplier: e.target.value})} /></td>
                                      <td className="p-1">
                                        <div className="flex items-center gap-1">
                                          <button onClick={handleMaterialSubmit} className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">保存</button>
                                          <button onClick={resetMaterialForm} className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500">取消</button>
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="font-medium text-xs">{material.name}</td>
                                      <td className="text-xs">{material.specification}</td>
                                      <td className="text-xs">{material.unit}</td>
                                      <td className="text-xs">{material.quantity}</td>
                                      <td className="text-xs">¥{Number(material.unitPrice || 0).toLocaleString()}</td>
                                      <td className="text-xs">¥{Number(material.totalPrice || 0).toLocaleString()}</td>
                                      <td className="text-xs">{material.supplier}</td>
                                      <td className="text-xs">
                                        <div className="flex items-center gap-1">
                                          <button 
                                            onClick={() => handleMaterialEdit(material)}
                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                          >
                                            <Edit className="text-sm" />
                                          </button>
                                          <button 
                                            onClick={() => handleMaterialDelete(material)}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                          >
                                            <Delete className="text-sm" />
                                          </button>
                                        </div>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* 采购经理/造价经理 - 采购合同标签 */}
        {(isProcurementManager || isCostManager) && activeTab === 'contracts' && (
          <div className="space-y-3">
            <div className="modern-card p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-800">采购合同</h3>
                <button 
                  onClick={() => {
                    setShowContractForm(true)
                    setContractFormData(prev => ({
                      ...prev,
                      contractNo: generateContractNo()
                    }))
                  }}
                  className="modern-btn flex items-center gap-1 text-xs px-2 py-1"
                >
                  <Add className="text-sm" />
                  新建合同
                </button>
              </div>
            </div>

            {!selectedProject ? (
              <div className="modern-card p-6 text-center text-gray-500 text-xs">
                请先选择一个项目
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {contracts.length === 0 ? (
                  <div className="modern-card p-6 text-center text-gray-500 text-xs col-span-full">
                    暂无采购合同
                  </div>
                ) : (
                  contracts.map((contract) => (
                    <div key={contract.id} className="modern-card p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-800 text-sm">{contract.contractName}</h4>
                            {getStatusBadge(contract.status)}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div className="bg-blue-50 p-2 rounded">
                              <p className="text-gray-600 font-medium text-xs">合同号</p>
                              <p className="text-gray-800 text-sm">{contract.contractNo}</p>
                            </div>
                            <div className="bg-blue-50 p-2 rounded">
                              <p className="text-gray-600 font-medium text-xs">供应商</p>
                              <p className="text-gray-800 text-sm truncate">{contract.supplierName}</p>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-gray-600 font-medium text-xs">合同金额</p>
                              <p className="text-gray-800 text-sm">¥{Number(contract.contractAmount).toLocaleString()}</p>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-gray-600 font-medium text-xs">付款方式</p>
                              <p className="text-gray-800 text-sm truncate">{contract.paymentMethod || '-'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          <button 
                            onClick={() => handleContractEdit(contract)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="text-sm" />
                          </button>
                          <button 
                            onClick={() => handleContractDelete(contract)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Delete className="text-sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 其他角色 - 项目列表 */}
        {!isProcurementManager && !isCostManager && (
          <div className="space-y-2">
            {projects.length === 0 ? (
              <div className="modern-card p-6 text-center animate-fade-in-up">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <FolderOpen className="text-2xl text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-600 mb-1">暂无项目</h3>
                <p className="text-xs text-gray-500 mb-3">开始创建您的第一个项目</p>
                {canManageProjects && (
                  <button 
                    onClick={() => setShowForm(true)}
                    className="modern-btn flex items-center gap-1 mx-auto text-xs px-2 py-1"
                  >
                    <Add className="text-sm" />
                    创建项目
                  </button>
                )}
              </div>
            ) : (
              projects.map((project, index) => (
                <div 
                  key={project.id} 
                  className="modern-card p-3 animate-fade-in-up hover:shadow-lg transition-all duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-gray-800 truncate">{project.name}</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-1 text-xs text-gray-600">
                        {project.client && (
                          <div className="flex items-center gap-1">
                            <Person className="text-sm" />
                            <span className="truncate">客户: {project.client}</span>
                          </div>
                        )}
                        
                        {project.totalBudget && (
                          <div className="flex items-center gap-1">
                            <AttachMoney className="text-sm" />
                            <span className="truncate">预算: ¥{Number(project.totalBudget).toLocaleString()}</span>
                          </div>
                        )}
                        
                        {project.createdAt && (
                          <div className="flex items-center gap-1">
                            <CalendarToday className="text-sm" />
                            <span className="truncate">创建: {new Date(project.createdAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      
                      {project.description && (
                        <p className="mt-1 text-xs text-gray-700 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-col lg:flex-row items-end lg:items-center gap-1 ml-2 flex-shrink-0">
                      {/* 材料管理按钮 - 采购经理和项目经理可见 */}
                      {(isProcurementManager || isPM || isAdmin) && (
                        <button 
                          onClick={() => window.open(`/project-materials/${project.id}`, '_blank')}
                          className="modern-btn-success flex items-center gap-1 text-xs px-2 py-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          <span className="hidden sm:inline">材料清单</span>
                          <span className="sm:hidden">材料</span>
                        </button>
                      )}
                      
                      {canManageProjects && (
                        <>
                          <button 
                            onClick={() => handleEdit(project)}
                            className="modern-btn-secondary flex items-center gap-1 text-xs px-2 py-1"
                          >
                            <Edit className="text-sm" />
                            <span className="hidden sm:inline">编辑</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(project)}
                            className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Delete className="text-sm" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 项目表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <form onSubmit={handleSubmit} className="modern-card w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-800">
                {editingProject ? '编辑项目' : '新建项目'}
              </h3>
              <button type="button" onClick={resetForm} className="text-gray-500 hover:text-gray-800 text-xl">
                ×
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">项目名称 *</label>
                  <input
                    className="modern-input w-full text-xs"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="项目名称"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">项目编号</label>
                  <input
                    className="modern-input w-full text-xs bg-gray-100"
                    value={formData.code}
                    placeholder="自动生成"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">合同编号</label>
                  <input
                    className="modern-input w-full text-xs"
                    value={formData.contractNo}
                    onChange={e => setFormData({...formData, contractNo: e.target.value})}
                    placeholder="合同编号"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">甲方单位 *</label>
                  <input
                    className="modern-input w-full text-xs"
                    value={formData.client}
                    onChange={e => setFormData({...formData, client: e.target.value})}
                    placeholder="甲方单位名称"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">项目经理</label>
                  <input
                    className="modern-input w-full text-xs"
                    value={formData.projectManager}
                    onChange={e => setFormData({...formData, projectManager: e.target.value})}
                    placeholder="项目经理姓名"
                  />
                </div>
              </div>

              {/* 金额信息 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">合同金额 (元) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="modern-input w-full text-xs"
                    value={formData.totalBudget}
                    onChange={e => setFormData({...formData, totalBudget: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">结算金额 (元)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="modern-input w-full text-xs"
                    value={formData.settlementAmount}
                    onChange={e => setFormData({...formData, settlementAmount: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">项目状态</label>
                  <select
                    className="modern-input w-full text-xs"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="draft">草稿</option>
                    <option value="pending">待审批</option>
                    <option value="approved">已审批</option>
                    <option value="in_progress">进行中</option>
                    <option value="completed">已完成</option>
                    <option value="suspended">暂停</option>
                  </select>
                </div>
              </div>

              {/* 时间信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">开始时间</label>
                  <input
                    type="date"
                    className="modern-input w-full text-xs"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">结束时间</label>
                  <input
                    type="date"
                    className="modern-input w-full text-xs"
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                  />
                </div>
              </div>

              {/* 文本信息 - 紧凑布局 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">工程概况</label>
                  <textarea
                    className="modern-input w-full h-12 resize-none text-xs"
                    value={formData.projectOverview}
                    onChange={e => setFormData({...formData, projectOverview: e.target.value})}
                    placeholder="工程概况描述"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">项目描述</label>
                  <textarea
                    className="modern-input w-full h-12 resize-none text-xs"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="项目描述"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">付款方式</label>
                  <textarea
                    className="modern-input w-full h-12 resize-none text-xs"
                    value={formData.paymentMethod}
                    onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                    placeholder="如：30%预付，60%到货，10%验收"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">开票信息</label>
                  <textarea
                    className="modern-input w-full h-12 resize-none text-xs"
                    value={formData.invoiceInfo}
                    onChange={e => setFormData({...formData, invoiceInfo: e.target.value})}
                    placeholder="开票信息"
                  />
                </div>
              </div>

              {/* 文件上传 - 紧凑布局 */}
              <div className="border-t pt-3 mt-3">
                <h4 className="text-sm font-bold text-gray-800 mb-2">甲方合同及材料</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1 text-xs">甲方合同文件</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      className="modern-input w-full text-xs"
                      onChange={e => {
                        const file = e.target.files[0]
                        if (file) {
                          setFormData({...formData, contractFile: file, contractFileName: file.name})
                        }
                      }}
                    />
                    {formData.contractFileName && (
                      <p className="text-xs text-green-600 mt-1">✓ {formData.contractFileName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1 text-xs">其他项目材料</label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar"
                      className="modern-input w-full text-xs"
                      onChange={e => {
                        const files = Array.from(e.target.files)
                        if (files.length > 0) {
                          setFormData({...formData, otherFiles: files, otherFileNames: files.map(f => f.name)})
                        }
                      }}
                    />
                    {formData.otherFileNames && formData.otherFileNames.length > 0 && (
                      <p className="text-xs text-green-600 mt-1">✓ 已选择 {formData.otherFileNames.length} 个文件</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
              <button type="button" onClick={resetForm} className="px-3 py-1 text-gray-600 hover:text-gray-800 text-xs">
                取消
              </button>
              <button type="submit" className="modern-btn text-xs px-3 py-1">
                {editingProject ? '更新' : '创建'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 材料表单 - 模态对话框 */}
      {showMaterialForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <form onSubmit={handleMaterialSubmit} className="modern-card w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-800">
                {editingMaterial ? '编辑材料' : '添加材料'}
              </h3>
              <button type="button" onClick={resetMaterialForm} className="text-gray-500 hover:text-gray-800 text-xl">
                ×
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-gray-700 font-medium mb-1 text-xs">材料名称 *</label>
                  <input
                    className="modern-input w-full text-xs"
                    value={materialFormData.name}
                    onChange={e => handleMaterialFormNameChange(e.target.value)}
                    placeholder="请输入材料名称"
                    required
                  />
                  {showMaterialFormSuggestions && materialSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                      {materialSuggestions.map((material, index) => (
                        <div
                          key={index}
                          onClick={() => selectMaterialFormSuggestion(material)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 text-xs"
                        >
                          <div className="font-medium text-gray-800">{material.name}</div>
                          <div className="text-gray-600 text-xs">
                            {material.specification && `规格: ${material.specification}`}
                            {material.unit && ` | 单位: ${material.unit}`}
                            {material.unitPrice && ` | 单价: ¥${material.unitPrice}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">规格型号</label>
                  <input
                    className="modern-input w-full text-xs"
                    value={materialFormData.specification}
                    onChange={e => setMaterialFormData({...materialFormData, specification: e.target.value})}
                    placeholder="请输入规格型号"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">单位</label>
                  <input
                    className="modern-input w-full text-xs"
                    value={materialFormData.unit}
                    onChange={e => setMaterialFormData({...materialFormData, unit: e.target.value})}
                    placeholder="如：件、米、吨"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">数量</label>
                  <input
                    type="number"
                    step="0.01"
                    className="modern-input w-full text-xs"
                    value={materialFormData.quantity}
                    onChange={e => {
                      const q = e.target.value
                      const tp = q && materialFormData.unitPrice ? (Number(q) * Number(materialFormData.unitPrice)).toFixed(2) : ''
                      setMaterialFormData({...materialFormData, quantity: q, totalPrice: tp})
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">单价 (元)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="modern-input w-full text-xs"
                    value={materialFormData.unitPrice}
                    onChange={e => {
                      const p = e.target.value
                      const tp = materialFormData.quantity && p ? (Number(materialFormData.quantity) * Number(p)).toFixed(2) : ''
                      setMaterialFormData({...materialFormData, unitPrice: p, totalPrice: tp})
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">总价 (元)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="modern-input w-full text-xs bg-gray-100"
                    value={materialFormData.totalPrice}
                    readOnly
                    placeholder="自动计算"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">供应商</label>
                  <input
                    className="modern-input w-full text-xs"
                    value={materialFormData.supplier}
                    onChange={e => setMaterialFormData({...materialFormData, supplier: e.target.value})}
                    placeholder="请输入供应商名称"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">材料类型</label>
                  <select
                    className="modern-input w-full text-xs"
                    value={materialFormData.type}
                    onChange={e => setMaterialFormData({...materialFormData, type: e.target.value})}
                  >
                    <option value="材料清单">材料清单</option>
                    <option value="施工清单">施工清单</option>
                    <option value="调试清单">调试清单</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1 text-xs">备注</label>
                <textarea
                  className="modern-input w-full h-12 resize-none text-xs"
                  value={materialFormData.remarks}
                  onChange={e => setMaterialFormData({...materialFormData, remarks: e.target.value})}
                  placeholder="请输入备注信息"
                />
              </div>
            </div>

            <div className="p-3 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
              <button type="button" onClick={resetMaterialForm} className="px-3 py-1 text-gray-600 hover:text-gray-800 text-xs">
                取消
              </button>
              <button type="submit" className="modern-btn text-xs px-3 py-1">
                {editingMaterial ? '更新' : '添加'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 合同表单 - 模态对话框（仅在采购合同标签显示） */}
      {showContractForm && (isProcurementManager || isCostManager) && activeTab === 'contracts' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <form onSubmit={handleContractSubmit} className="modern-card w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-800">
                {editingContract ? '编辑合同' : '新建合同'}
              </h3>
              <button type="button" onClick={resetContractForm} className="text-gray-500 hover:text-gray-800 text-xl">
                ×
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">合同名称 *</label>
                  <input
                    className="modern-input w-full text-xs"
                    value={contractFormData.contractName}
                    onChange={e => setContractFormData({...contractFormData, contractName: e.target.value})}
                    placeholder="请输入合同名称"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">合同编号</label>
                  <input
                    className="modern-input w-full text-xs bg-gray-100"
                    value={contractFormData.contractNo}
                    readOnly
                    placeholder="自动生成"
                  />
                  <p className="text-xs text-gray-500 mt-1">自动生成格式：HN-CG-Year-Month-Day-Sequence</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">供应商名称 *</label>
                  <input
                    className="modern-input w-full text-xs"
                    value={contractFormData.supplierName}
                    onChange={e => setContractFormData({...contractFormData, supplierName: e.target.value})}
                    placeholder="请输入供应商名称"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">合同金额 (元)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="modern-input w-full text-xs"
                    value={contractFormData.contractAmount}
                    onChange={e => setContractFormData({...contractFormData, contractAmount: e.target.value})}
                    placeholder="请输入合同金额"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">联系人</label>
                  <input
                    className="modern-input w-full text-xs"
                    value={contractFormData.contactPerson}
                    onChange={e => setContractFormData({...contractFormData, contactPerson: e.target.value})}
                    placeholder="请输入联系人"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-xs">联系电话</label>
                  <input
                    className="modern-input w-full text-xs"
                    value={contractFormData.contactPhone}
                    onChange={e => setContractFormData({...contractFormData, contactPhone: e.target.value})}
                    placeholder="请输入联系电话"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1 text-xs">付款方式</label>
                <textarea
                  className="modern-input w-full h-12 resize-none text-xs"
                  value={contractFormData.paymentMethod}
                  onChange={e => setContractFormData({...contractFormData, paymentMethod: e.target.value})}
                  placeholder="请输入付款方式，如：30%预付，60%到货，10%验收"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1 text-xs">上传合同文件</label>
                <input
                  type="file"
                  className="modern-input w-full text-xs"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setContractFormData({...contractFormData, contractFile: file, contractFileName: file.name})
                    }
                  }}
                />
                {contractFormData.contractFileName && (
                  <p className="text-xs text-green-600 mt-1">已选择: {contractFormData.contractFileName}</p>
                )}
              </div>
            </div>

            <div className="p-3 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
              <button type="button" onClick={resetContractForm} className="px-3 py-1 text-gray-600 hover:text-gray-800 text-xs">
                取消
              </button>
              <button type="submit" className="modern-btn text-xs px-3 py-1">
                {editingContract ? '更新' : '创建'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}